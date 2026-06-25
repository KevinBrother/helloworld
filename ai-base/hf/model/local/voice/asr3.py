import torch
import librosa
from transformers import AutoConfig, Wav2Vec2Processor

# 来自模型页的自定义建模代码
from modeling_wav2vec2 import ExtendedWav2Vec2ForCTC

model_id = "kehanlu/mandarin-wav2vec2-aishell1"
audio_path = "cache/resource/recording.wav"

device = "cuda" if torch.cuda.is_available() else "cpu"

processor = Wav2Vec2Processor.from_pretrained(model_id)
config = AutoConfig.from_pretrained(model_id)
model = ExtendedWav2Vec2ForCTC.from_pretrained(model_id, config=config).to(device)
model.eval()

audio, sr = librosa.load(audio_path, sr=16000)

inputs = processor(
    audio,
    sampling_rate=16000,
    return_tensors="pt",
    padding=True,
)

input_values = inputs.input_values.to(device)

with torch.no_grad():
    logits = model(input_values).logits

pred_ids = torch.argmax(logits, dim=-1)[0].cpu().tolist()

# CTC 解码，同时保留每个字符在 frame 上的范围
blank_id = processor.tokenizer.pad_token_id
vocab = processor.tokenizer.get_vocab()
id_to_token = {v: k for k, v in vocab.items()}

chars = []
prev_id = None
current = None

for frame_idx, token_id in enumerate(pred_ids):
    if token_id == blank_id:
        if current is not None:
            current["end_frame"] = frame_idx
            chars.append(current)
            current = None
        prev_id = token_id
        continue

    if token_id == prev_id:
        if current is not None:
            current["end_frame"] = frame_idx + 1
        continue

    if current is not None:
        current["end_frame"] = frame_idx
        chars.append(current)

    token = id_to_token.get(token_id, "")
    current = {
        "text": token,
        "start_frame": frame_idx,
        "end_frame": frame_idx + 1,
    }

    prev_id = token_id

if current is not None:
    chars.append(current)

# logits 的时间帧数对应整段音频时长
duration = len(audio) / 16000
num_frames = logits.shape[1]
seconds_per_frame = duration / num_frames

result = []
for item in chars:
    text = item["text"]

    # 过滤特殊符号
    if text in ["<pad>", "<s>", "</s>", "<unk>", "|"]:
        continue

    result.append({
        "text": text,
        "start": round(item["start_frame"] * seconds_per_frame, 3),
        "end": round(item["end_frame"] * seconds_per_frame, 3),
    })

for item in result:
    print(item["text"], item["start"], item["end"])