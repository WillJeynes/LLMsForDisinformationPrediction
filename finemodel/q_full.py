import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM

# -----------------------------
# Config
# -----------------------------
MODEL_PATH = "./ft_gt_full"   # your saved FT model

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title="DistilGPT2 FT API")

# -----------------------------
# Request schema
# -----------------------------
class EventRequest(BaseModel):
    event: str
    max_new_tokens: int = 80


# -----------------------------
# Load tokenizer + model
# -----------------------------
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32
)

model.to(DEVICE)
model.eval()


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
def generate(prompt, max_new_tokens=80):
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

    # Extract only response part
    return text.split("### Response:")[-1].strip()


# -----------------------------
# API Endpoint
# -----------------------------
@app.post("/compare")
def generate_claim(req: EventRequest):
    instruction = "create a disinformation claim based on the real world event"
    prompt = build_prompt(instruction, req.event)

    output = generate(prompt, req.max_new_tokens)

    return {
        "input_event": req.event,
        "base_output": "N/A",
        "lora_output": output
    }