import os
import requests

API_URL = "https://router.huggingface.co/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {os.environ.get('HF_TOKEN')}",
    "Content-Type": "application/json",
}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload, timeout=60)
    return response.json()

response = query({
    "model": "Qwen/Qwen2.5-7B-Instruct:novita",
    "messages": [
        {
            "role": "user",
            "content": "你好，请介绍一下你自己。"
        }
    ],
    "max_tokens": 200,
    "temperature": 0.7,
})

print(response["choices"][0]["message"])
