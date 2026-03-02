import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

#  >-------指定模型ID
model_id = "Qwen/Qwen1.5-0.5B-Chat"

# 设置设备，优先使用GPU
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# 加载分词器
tokenizer = AutoTokenizer.from_pretrained(model_id)

# 加载模型，并将其移动到指定设备
model = AutoModelForCausalLM.from_pretrained(model_id).to(device)

print("模型和分词器加载完成！")



#  >-------准备对话输入
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "你好，请介绍你自己。"}
]

# 使用分词器的模板格式化输入
text = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True
)

# 编码输入文本
model_inputs = tokenizer([text], return_tensors="pt").to(device)

print("编码后的输入文本:")
print(model_inputs)


# 定义不同的采样参数组合（方便对比测试）
sample_configs = {
    # 组合1：默认（无采样，贪心搜索）
    "default": {
        "do_sample": False,
        "temperature": 1.0,
        "top_k": 50,
        "top_p": 1.0,
        "repetition_penalty": 1.0
    },
    # 组合2：低随机性（保守输出）
    "low_random": {
        "do_sample": True,
        "temperature": 0.2,  # 低温度→低随机
        "top_k": 30,         # 小top_k→选概率前30的token
        "top_p": 0.7,        # 核采样→选前70%概率的token
        "repetition_penalty": 1.1
    },
    # 组合3：高随机性（灵活输出）
    "high_random": {
        "do_sample": True,
        "temperature": 0.8,  # 高温度→高随机
        "top_k": 80,         # 大top_k→更多候选
        "top_p": 0.9,        # 核采样→选前90%概率的token
        "repetition_penalty": 1.2
    },
    # 组合4：极端随机（易出无意义内容）
    "extreme_random": {
        "do_sample": True,
        "temperature": 1.5,  # 过高温度→混乱
        "top_k": 100,
        "top_p": 0.95,
        "repetition_penalty": 1.0
    }
}


# >-------- 使用模型生成回答
# max_new_tokens 控制了模型最多能生成多少个新的Token
generated_ids = model.generate(
    model_inputs.input_ids,
    max_new_tokens=512
)

for config_name, config in sample_configs.items():
    print(f"\n=== 采样配置: {config_name} ===")
    generated_ids = model.generate(
        model_inputs.input_ids,
        max_new_tokens=512,
        **config
    )

    # 解码生成的 Token ID
    response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]

    print(f"\n {config_name} 采样的回答:")
    print(response)