import torch
import random
import pandas as pd
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    DataCollatorForLanguageModeling,
    TrainingArguments,
    Trainer,
    AutoTokenizer,
)
from peft import LoraConfig, get_peft_model, TaskType

# =========================
# 1. LOAD DATA
# =========================
df = pd.read_csv("../data/dataset.csv")

event_cols = ["Event1", "Event2", "Event3", "Event4", "Event5"]

long_df = df.melt(
    id_vars=["Normalized"],
    value_vars=event_cols,
    var_name="event_column",
    value_name="event"
)

long_df = long_df.dropna(subset=["event"])

# =========================
# 2. INSTRUCTION VARIATION
# =========================
INSTRUCTION_TEMPLATES = [
    "Create a disinformation claim based on the real world event.",
    "Write a misleading claim about the following event.",
    "Generate a false narrative inspired by this event.",
    "Produce a distorted version of the event as a claim.",
    "Turn this event into a disinformation statement.",
    "Imagine you are working as a pre-bunker, what narratives might appear after this event.",
    "How could this event me misinterpreted falsley as disinformation",
]

# Structural formats
FORMATS = [
    lambda i, inp: f"### Instruction:\n{i}\n\n### Input:\n{inp}\n\n### Response:\n",
    lambda i, inp: f"Instruction: {i}\nInput: {inp}\nOutput:",
    lambda i, inp: f"{i}\n\nEvent:\n{inp}\n\nClaim:",
    lambda i, inp: f"Task -> {i}\nData -> {inp}\nAnswer:",
]

def format_example(ex):
    instruction = random.choice(INSTRUCTION_TEMPLATES)
    inp = ex.get("input", "").strip()
    out = ex["output"].strip()

    formatter = random.choice(FORMATS)
    prompt = formatter(instruction, inp)

    return prompt, out

# =========================
# 3. BUILD DATASET
# =========================
toy_instr_data = [
    {
        "instruction": "placeholder",  # no longer used directly
        "input": row["event"],
        "output": row["Normalized"],
    }
    for _, row in long_df.iterrows()
]

toy_ds = Dataset.from_list(toy_instr_data)
toy_ds = toy_ds.train_test_split(test_size=0.3, seed=42)

# =========================
# 4. TOKENIZER
# =========================
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

tok = AutoTokenizer.from_pretrained(model_name)
tok.pad_token = tok.eos_token

MAX_LENGTH = 256  # increased context length

# =========================
# 5. TOKENIZATION WITH MASKING
# =========================
def tokenize_lm(example):
    prompt, out = format_example(example)
    full_text = prompt + out + tok.eos_token

    tokenized = tok(
        full_text,
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH
    )

    prompt_ids = tok(
        prompt,
        truncation=True,
        max_length=MAX_LENGTH
    )["input_ids"]

    labels = tokenized["input_ids"].copy()

    # Mask prompt tokens
    prompt_len = min(len(prompt_ids), MAX_LENGTH)
    labels[:prompt_len] = [-100] * prompt_len

    tokenized["labels"] = labels
    return tokenized

toy_tok = toy_ds.map(tokenize_lm, remove_columns=toy_ds["train"].column_names)
toy_tok.set_format(type="torch")

# =========================
# 6. DEVICE + OPTIONAL QUANT
# =========================
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

bnb_available = False
try:
    import bitsandbytes
    bnb_available = DEVICE == "cuda"
except ImportError:
    pass

quant_kwargs = {}
if bnb_available:
    from transformers import BitsAndBytesConfig
    quant_kwargs["quantization_config"] = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4"
    )
    quant_kwargs["device_map"] = {"": 0}

# =========================
# 7. MODEL + LORA (IMPROVED)
# =========================
base_model = AutoModelForCausalLM.from_pretrained(
    model_name,
    **quant_kwargs
)

lora_cfg = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,                      # increased rank
    lora_alpha=64,             # increased scaling
    lora_dropout=0.05,
    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj"
    ]
)

model = get_peft_model(base_model, lora_cfg)

# =========================
# 8. TRAINING ARGS (IMPROVED)
# =========================
training_args = TrainingArguments(
    output_dir="./ft_lora2",
    per_device_train_batch_size=1,
    per_device_eval_batch_size=1,
    gradient_accumulation_steps=4,   # improves effective batch size
    num_train_epochs=5,
    learning_rate=2e-5,
    warmup_ratio=0.1,                # added warmup
    eval_strategy="epoch",
    save_strategy="epoch",
    logging_steps=10,
    optim="adamw_torch",
    fp16=torch.cuda.is_available(),  # mixed precision
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    report_to="none"
)

data_collator = DataCollatorForLanguageModeling(
    tokenizer=tok,
    mlm=False
)

# =========================
# 9. TRAINER
# =========================
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=toy_tok["train"],
    eval_dataset=toy_tok["test"],
    data_collator=data_collator,
)

# =========================
# 10. TRAIN
# =========================
trainer.train()

metrics = trainer.evaluate()
print(metrics)

# =========================
# 11. SAVE ADAPTER
# =========================
model.save_pretrained("./ft_lora2_adapter")
tok.save_pretrained("./ft_lora2_adapter")