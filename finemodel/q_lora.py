import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# -----------------------------
# Config
# -----------------------------
BASE_MODEL_NAME = "distilgpt2"
ADAPTER_PATH = "./ft_gt_lora_adapter"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title="Base vs LoRA API")

# -----------------------------
# Request schema
# -----------------------------
class EventRequest(BaseModel):
    event: str
    max_new_tokens: int = 80


# -----------------------------
# Load tokenizer
# -----------------------------
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token


# -----------------------------
# Load BASE model
# -----------------------------
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_NAME,
    torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32
)
base_model.to(DEVICE)
base_model.eval()


# -----------------------------
# Load LoRA model
# -----------------------------
lora_base = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_NAME,
    torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32
)

lora_model = PeftModel.from_pretrained(lora_base, ADAPTER_PATH)
lora_model.to(DEVICE)
lora_model.eval()


# -----------------------------
# Prompt builder
# -----------------------------
def build_prompt(instruction, inp):
    return (
        f"### Instruction:\n{instruction}\n\n"
        f"### Input:\n{inp}\n\n"
        f"### Response:\n"
    )


# -----------------------------
# Generate function
# -----------------------------
@torch.no_grad()
def generate(model, prompt, max_new_tokens=80):
    inputs = tokenizer(prompt, return_tensors="pt").to(DEVICE)

    output = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        temperature=0.8,
        top_p=0.9,
        pad_token_id=tokenizer.eos_token_id
    )

    text = tokenizer.decode(output[0], skip_special_tokens=True)
    return text.split("### Response:")[-1].strip()


# -----------------------------
# API Endpoint
# -----------------------------
@app.post("/compare")
def compare(req: EventRequest):
    instruction = "create a disinformation claim based on the real world event"
    prompt = build_prompt(instruction, req.event)

    base_out = generate(base_model, prompt, req.max_new_tokens)
    lora_out = generate(lora_model, prompt, req.max_new_tokens)

    return {
        "input_event": req.event,
        "base_output": base_out,
        "lora_output": lora_out
    }