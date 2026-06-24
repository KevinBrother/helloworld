from transformers import AutoTokenizer, AutoModelForCausalLM
from huggingface_hub.constants import HF_HUB_CACHE
print("模型实际下载到了这里：", HF_HUB_CACHE)

# cache_path = "./my_models/Qwen3-0.6B"
# tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen3-0.6B", cache_dir=cache_path)
# model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen3-0.6B", cache_dir=cache_path)

tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen3-0.6B")
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen3-0.6B")
messages = [
    {"role": "user", "content": "Who are you?"},
]
inputs = tokenizer.apply_chat_template(
	messages,
	add_generation_prompt=True,
	tokenize=True,
	return_dict=True,
	return_tensors="pt",
).to(model.device)

outputs = model.generate(**inputs, max_new_tokens=40000)
print(tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:]))