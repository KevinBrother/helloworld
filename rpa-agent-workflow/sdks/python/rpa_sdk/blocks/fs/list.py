from pathlib import Path


def list_entries(path=None, recursive=False, **_kwargs):
    if not path:
        raise ValueError("path is required")

    root = Path(path)
    if not root.exists():
        raise FileNotFoundError(str(root))
    if not root.is_dir():
        raise NotADirectoryError(str(root))

    candidates = root.rglob("*") if recursive else root.iterdir()
    entries = [entry_for(candidate) for candidate in candidates]
    entries.sort(key=lambda entry: entry["path"])
    return {"entries": entries, "count": len(entries)}


def entry_for(path):
    if path.is_file():
        entry_type = "file"
        size = path.stat().st_size
    elif path.is_dir():
        entry_type = "directory"
        size = 0
    else:
        entry_type = "other"
        size = 0

    return {
        "path": str(path),
        "name": path.name,
        "type": entry_type,
        "size": size,
    }
