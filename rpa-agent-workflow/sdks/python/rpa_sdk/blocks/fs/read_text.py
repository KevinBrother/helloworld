from pathlib import Path


def read_text(path=None, encoding="utf-8", **_kwargs):
    if not path:
        raise ValueError("path is required")

    file_path = Path(path)
    raw = file_path.read_bytes()
    text = raw.decode(encoding or "utf-8")
    return {
        "path": str(file_path),
        "text": text,
        "bytes": len(raw),
    }
