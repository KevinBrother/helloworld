import os
from pathlib import Path

from datasets import Dataset, DatasetDict, load_dataset, load_from_disk


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "cache" / "NousResearch" / "hermes-function-calling-v1"
ARROW_FILE = DATASET_DIR / "data-00000-of-00001.arrow"
EXPECTED_ROWS = 1893
EXPECTED_COLUMNS = ["id", "conversations", "tools", "category", "subcategory", "task"]


def check_dataset(name: str, dataset: Dataset) -> None:
    assert len(dataset) == EXPECTED_ROWS, f"{name}: expected {EXPECTED_ROWS} rows, got {len(dataset)}"
    assert dataset.column_names == EXPECTED_COLUMNS, f"{name}: unexpected columns {dataset.column_names}"

    first = dataset[0]
    assert first["id"], f"{name}: first row id is empty"
    assert isinstance(first["conversations"], list), f"{name}: conversations should be a list"
    assert first["tools"], f"{name}: first row tools is empty"

    print(f"{name}: {len(dataset)} rows")
    print(f"  columns: {dataset.column_names}")
    print(f"  first id: {first['id']}")


def case_load_saved_dataset_dir_relative_path() -> None:
    # 从项目根目录运行脚本时，读取 dataset.save_to_disk(...) 保存出来的相对目录。
    original_cwd = Path.cwd()
    try:
        os.chdir(PROJECT_ROOT)
        dataset = load_from_disk(str(DATASET_DIR.relative_to(PROJECT_ROOT)))
    finally:
        os.chdir(original_cwd)
    check_dataset("load_from_disk(relative dataset dir)", dataset)


def case_load_saved_dataset_dir_absolute_path() -> None:
    # 适合脚本从任何工作目录运行。
    dataset = load_from_disk(str(DATASET_DIR))
    check_dataset("load_from_disk(absolute dataset dir)", dataset)


def case_load_arrow_file_directly() -> None:
    # 只想读取单个 Arrow 数据文件时可用；不会读取 state.json。
    dataset = Dataset.from_file(str(ARROW_FILE))
    check_dataset("Dataset.from_file(arrow file)", dataset)


def case_load_arrow_file_as_dataset_dict() -> None:
    # 需要 DatasetDict 结构时使用。这里手动把本地 Arrow 文件命名为 train split。
    dataset_dict = load_dataset("arrow", data_files={"train": str(ARROW_FILE)})
    assert isinstance(dataset_dict, DatasetDict)
    check_dataset('load_dataset("arrow", data_files={"train": ...})', dataset_dict["train"])


def main() -> None:
    if not DATASET_DIR.exists():
        raise FileNotFoundError(f"Dataset directory not found: {DATASET_DIR}")
    if not ARROW_FILE.exists():
        raise FileNotFoundError(f"Arrow file not found: {ARROW_FILE}")

    case_load_saved_dataset_dir_relative_path()
    case_load_saved_dataset_dir_absolute_path()
    case_load_arrow_file_directly()
    case_load_arrow_file_as_dataset_dict()


if __name__ == "__main__":
    main()
