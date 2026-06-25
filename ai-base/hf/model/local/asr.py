from transformers import pipeline

# 本地加载 Whisper-large-v3 模型（首次运行会自动下载权重）
# 您可以指定 device="cuda" 来启用 GPU 加速
transcriber = pipeline(
    "automatic-speech-recognition", 
    model="openai/whisper-large-v3",
    device="cuda"  
)

# 执行语音识别
output = transcriber("cache/resource/recording.wav")

# 打印识别结果
print(output["text"])
