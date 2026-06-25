from transformers import pipeline

pipe = pipeline(
    "automatic-speech-recognition",
    model="jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn",
    device=0,
)

result = pipe(
    "cache/resource/recording.wav",
    return_timestamps="char",
)

for item in result["chunks"]:
    print(item["text"], item["timestamp"])