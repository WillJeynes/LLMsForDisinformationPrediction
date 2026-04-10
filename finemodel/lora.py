# https://github.com/karimiannima/LLM-Fine-Tuning-Step-by-Step-Tutorial/blob/main/LLM_Fine_Tuning_Tutorial.ipynb
import torch
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset
from transformers import AutoModelForCausalLM, DataCollatorForLanguageModeling, TrainingArguments, Trainer, AutoTokenizer
import pandas as pd

# Load your CSV
df = pd.read_csv("../data/dataset.csv")

# Event columns
event_cols = ["Event1", "Event2", "Event3", "Event4", "Event5"]

# Melt wide -> long format
long_df = df.melt(
    id_vars=["Normalized"],
    value_vars=event_cols,
    var_name="event_column",
    value_name="event"
)

# Drop missing events
long_df = long_df.dropna(subset=["event"])

# Build instruction-format dataset
toy_instr_data = [
    {
        "instruction": "create a disinformation claim based on the real world event",
        "input": row["event"],
        "output": row["Normalized"]
    }
    for _, row in long_df.iterrows()
]

# Example: print first few
print(toy_instr_data[:3])

tok_gpt  = AutoTokenizer.from_pretrained("distilgpt2")
tok_gpt.pad_token = tok_gpt.eos_token 

data_collator = DataCollatorForLanguageModeling(tokenizer=tok_gpt, mlm=False) 

def format_example(ex):
    instruction = ex["instruction"].strip()
    inp = ex.get("input", "").strip()
    out = ex["output"].strip()
    if inp:
        prompt = f"### Instruction:\n{instruction}\n\n### Input:\n{inp}\n\n### Response:\n"
    else:
        prompt = f"### Instruction:\n{instruction}\n\n### Response:\n"
    return prompt, out

def build_text(example):
    prompt, out = format_example(example)
    return {"text": prompt + out + tok_gpt.eos_token}   # assumes tok_gpt defined earlier

toy_ds = Dataset.from_list(toy_instr_data).map(build_text)
toy_ds = toy_ds.train_test_split(test_size=0.3, seed=42)

def tokenize_lm(batch):
    return tok_gpt(batch["text"], truncation=True, padding="max_length", max_length=256)

toy_tok = toy_ds.map(tokenize_lm, batched=True, remove_columns=["text"])
# For causal LM, labels = input_ids
toy_tok = toy_tok.map(lambda examples: {"labels": examples["input_ids"]})
toy_tok.set_format(type="torch")

# Check if CUDA is available
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Optional: 4/8-bit quantization if bitsandbytes + CUDA are available
bnb_available = False
try:
    import bitsandbytes
    bnb_available = DEVICE == "cuda"
except ImportError:
    pass

quant_kwargs = {}
if bnb_available:
    from transformers import BitsAndBytesConfig
    quant_kwargs["quantization_config"] = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_use_double_quant=True, bnb_4bit_quant_type="nf4")
    quant_kwargs["device_map"] = {"": 0}  # specify device map

base_lm = AutoModelForCausalLM.from_pretrained("distilgpt2", **quant_kwargs)


lora_cfg = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=8,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["c_attn", "c_proj"],
)

lora_model = get_peft_model(base_lm, lora_cfg)

args_lora = TrainingArguments(
    output_dir="./ft_gt_lora",
    per_device_train_batch_size=2,
    per_device_eval_batch_size=2,
    num_train_epochs=10,
    learning_rate=1e-4,
    eval_strategy="epoch",
    save_strategy="epoch",
    logging_steps=10,
    optim="adamw_torch",
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False
)

trainer_lora = Trainer(
    model=lora_model,
    args=args_lora,
    train_dataset=toy_tok["train"],
    eval_dataset=toy_tok["test"],
    data_collator=data_collator,
)

trainer_lora.train()
lora_metrics = trainer_lora.evaluate()
lora_metrics

# Save the adapter weights
lora_model.save_pretrained("./ft_gt_lora_adapter")