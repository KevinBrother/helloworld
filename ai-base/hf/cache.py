from huggingface_hub.constants import HF_HUB_CACHE

# 2. 导入数据集和模块缓存变量（来自 datasets 官方配置）
from datasets.config import HF_DATASETS_CACHE, HF_MODULES_CACHE

print("模型实际下载到了这里：", HF_HUB_CACHE)
print("数据集实际下载到了这里：", HF_DATASETS_CACHE)
print("模块实际下载到了这里：", HF_MODULES_CACHE)

