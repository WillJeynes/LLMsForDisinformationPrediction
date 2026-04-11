import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    DataCollatorForLanguageModeling,
    TrainingArguments,
    Trainer,
    AutoTokenizer
)
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

model_name = "distilgpt2"
tok_gpt = AutoTokenizer.from_pretrained(model_name)

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
    return {"text": prompt + out + tok_gpt.eos_token}

toy_ds = Dataset.from_list(toy_instr_data).map(build_text)
toy_ds = toy_ds.train_test_split(test_size=0.3, seed=42)

def tokenize_lm(batch):
    return tok_gpt(
        batch["text"],
        truncation=True,
        padding="max_length",
        max_length=256
    )

toy_tok = toy_ds.map(tokenize_lm, batched=True, remove_columns=["text"])
toy_tok = toy_tok.map(lambda examples: {"labels": examples["input_ids"]})
toy_tok.set_format(type="torch")


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

model = AutoModelForCausalLM.from_pretrained(model_name).to(DEVICE)

args = TrainingArguments(
    output_dir="./ft_gt_full",
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    gradient_accumulation_steps=1,
    num_train_epochs=5,
    learning_rate=5e-5,
    eval_strategy="epoch",
    save_strategy="epoch",
    logging_steps=10,
    optim="adamw_torch",
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    fp16=torch.cuda.is_available(),
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=toy_tok["train"],
    eval_dataset=toy_tok["test"],
    data_collator=data_collator,
)

trainer.train()

metrics = trainer.evaluate()
print(metrics)

trainer.save_model("./ft_gt_full")
tok_gpt.save_pretrained("./ft_gt_full")