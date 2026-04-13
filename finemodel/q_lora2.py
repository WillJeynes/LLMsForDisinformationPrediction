import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# -----------------------------
# Config
# -----------------------------
BASE_MODEL_NAME = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
ADAPTER_PATH = "./ft_lora_adapter"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title="Base vs LoRA API")

# -----------------------------
# Request schema
# -----------------------------
class EventRequest(BaseModel):
    event: str
    max_new_tokens: int = 20


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
def generate(
    model,
    prompt,
    max_new_tokens=20,
    num_first_tokens=5,
    temperature=0.9,
    top_p=0.95
):
    inputs = tokenizer(prompt, return_tensors="pt").to(DEVICE)
    input_ids = inputs["input_ids"]

    # Get first-tokens distribution
    outputs = model(**inputs)
    logits = outputs.logits[:, -1, :] / temperature
    probs = torch.softmax(logits, dim=-1)

    # Top-k first tokens
    topk_probs, topk_indices = torch.topk(probs, num_first_tokens)

    results = []

    # For each possible
    for token_id in topk_indices[0]:
        token_id = token_id.view(1, 1).to(DEVICE)
        print("starting token: " + str(token_id))
        # Start sequence with forced first token
        generated = torch.cat([input_ids, token_id], dim=1)

        # Continue gen
        for _ in range(max_new_tokens):
            outputs = model(input_ids=generated)
            next_logits = outputs.logits[:, -1, :] / temperature

            next_probs = torch.softmax(next_logits, dim=-1)

            # nucleus sampling
            sorted_probs, sorted_indices = torch.sort(next_probs, descending=True)
            cumulative_probs = torch.cumsum(sorted_probs, dim=-1)

            cutoff = cumulative_probs > top_p
            cutoff[..., 1:] = cutoff[..., :-1].clone()
            cutoff[..., 0] = False

            sorted_probs[cutoff] = 0
            sorted_probs = sorted_probs / sorted_probs.sum(dim=-1, keepdim=True)

            next_token = sorted_indices.gather(
                -1,
                torch.multinomial(sorted_probs, num_samples=1)
            )

            generated = torch.cat([generated, next_token], dim=1)
            print("word")
            # early stop???
            if next_token.item() == tokenizer.eos_token_id:
                break

        text = tokenizer.decode(generated[0], skip_special_tokens=True)
        results.append(text.split("### Response:")[-1].strip())

    return results

# -----------------------------
# API Endpoint
# -----------------------------
@app.post("/compare")
def compare(req: EventRequest):
    instruction = "create a disinformation claim based on the real world event"
    prompt = build_prompt(instruction, req.event)

    # base_out = generate(base_model, prompt, req.max_new_tokens)
    lora_out = generate(lora_model, prompt, req.max_new_tokens)

    return {
        "input_event": req.event,
        "base_output": "NONE",
        "lora_output": lora_out
    }