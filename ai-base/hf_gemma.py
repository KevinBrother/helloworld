import os
import requests

API_URL = "https://router.huggingface.co/v1/chat/completions"
MODEL = "google/gemma-4-31B-it:novita"


def build_headers():
    token = os.environ.get("HF_TOKEN")
    if not token:
        raise RuntimeError("HF_TOKEN is required. Set it before running this script.")

    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def query(payload):
    response = requests.post(API_URL, headers=build_headers(), json=payload, timeout=60)

    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError(
            f"Hugging Face API returned non-JSON response ({response.status_code}): "
            f"{response.text[:200]}"
        ) from exc

    if not response.ok:
        message = data.get("error") or data.get("message") or data
        raise RuntimeError(f"Hugging Face API error ({response.status_code}): {message}")

    return data


def extract_message(response):
    if "choices" not in response:
        message = response.get("error") or response.get("message") or response
        raise RuntimeError(f"Hugging Face API error: {message}")

    try:
        return response["choices"][0]["message"]
    except (IndexError, KeyError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Hugging Face response shape: {response}") from exc


def build_payload():
    return {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": "你好，请介绍一下你自己。"
            }
        ],
        "max_tokens": 200,
        "temperature": 0.7,
    }


def main():
    response = query(build_payload())

    print(extract_message(response))


if __name__ == "__main__":
    main()
