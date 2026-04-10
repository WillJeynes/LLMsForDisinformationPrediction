import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# -----------------------------
# Config
# -----------------------------
BASE_MODEL_NAME = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
ADAPTER_PATH = "./ft_lora_adapter"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# -----------------------------
# Tokenizer
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
# Prompt builder (MUST match training)
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
# Compare function
# -----------------------------
def compare(event_input):
    instruction = "create a disinformation claim based on the real world event"
    prompt = build_prompt(instruction, event_input)

    print("\n" + "="*80)
    print("INPUT EVENT:")
    print(event_input)
    print("="*80)

    base_out = generate(base_model, prompt)
    lora_out = generate(lora_model, prompt)

    print("\n🧠 BASE MODEL OUTPUT (distilgpt2):")
    print("-"*80)
    print(base_out)

    print("\n🎯 LoRA FINE-TUNED OUTPUT:")
    print("-"*80)
    print(lora_out)

    print("\n" + "="*80)


# -----------------------------
# Interactive loop
# -----------------------------
if __name__ == "__main__":
    print("Base vs LoRA comparison ready. Type 'exit' to quit.\n")

    while True:
        event = input("Enter event: ")

        if event.lower() in ["exit", "quit"]:
            break

        compare(event)