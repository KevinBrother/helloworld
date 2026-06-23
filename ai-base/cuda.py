import torch

def main():
    print("===== PyTorch 环境测试 =====")
    print(f"PyTorch 版本: {torch.__version__}")

    # 1. 打印 PyTorch 内置的 CUDA 版本
    # 哪怕 torch.cuda.is_available() 是 False，只要安装的是 GPU 版本的 PyTorch，这个就能打印出来
    print(f"PyTorch 编译所用的 CUDA 版本: {torch.version.cuda}")

    # 2. 检查当前显卡和驱动是否可用
    if torch.cuda.is_available():
        print(f"🟢 GPU 可用! 显卡型号: {torch.cuda.get_device_name(0)}")
        
        # 3. 打印当前系统显卡驱动支持的最高 CUDA 版本
        cuda_version = torch.cuda.get_device_capability(0)
        print(f"显卡算力 (Capability): {cuda_version}")
        
    elif torch.backends.mps.is_available():
        print("🟢 Apple Silicon GPU (MPS) 可用!")
    else:
        print("⚪ 当前使用的是 CPU 模式。")

if __name__ == "__main__":
    main()
