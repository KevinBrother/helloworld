from pathlib import Path


def write_text(path=None, text="", encoding="utf-8", append=False, createDirs=False, **_kwargs):
    if not path:
        raise ValueError("path is required")

    file_path = Path(path)
    if createDirs:
        file_path.parent.mkdir(parents=True, exist_ok=True)

    encoded = str(text).encode(encoding or "utf-8")
    mode = "ab" if append else "wb"
    with file_path.open(mode) as output:
        output.write(encoded)

    return {
        "path": str(file_path),
        "bytes": len(encoded),
    }
