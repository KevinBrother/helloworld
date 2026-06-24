from datasets import load_dataset

# 在线加载数据集，需要先连接网络，会自动下载到本地缓存目录
dataset = load_dataset("NousResearch/hermes-function-calling-v1")

# dataset.save_to_disk(r"./cache/NousResearch/hermes-function-calling-v1")

print(f"Dataset loaded with {len(dataset)} samples.")

print(dataset)

train_dataset = dataset["train"]

# 只看前 5 条数据
for i in range(5):
    print(f"Sample {i + 1}:")
    print(train_dataset[i])
    print()