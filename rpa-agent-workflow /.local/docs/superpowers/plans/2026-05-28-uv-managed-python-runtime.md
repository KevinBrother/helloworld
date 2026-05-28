# uv-Managed Python Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `runtime/python` a standard `uv`-managed Python project that can be synced and run from its own directory.

**Architecture:** Keep the runtime package layout unchanged and add the minimum project metadata needed for `uv` to treat `runtime/python` as an installable project. Verification stays local to `runtime/python` and uses `uv sync` plus the existing unittest suite.

**Tech Stack:** Python 3.14+, `uv`, `setuptools`, `unittest`

---

### Task 1: Make `runtime/python` installable by `uv`

**Files:**
- Modify: `runtime/python/pyproject.toml`

- [ ] **Step 1: Write the failing test**

Add a project metadata check that only passes once `uv` can treat this directory as a real project by installing the local package and importing `rpa_runtime` from the synced environment.

```bash
cd runtime/python
uv run python -c "import rpa_runtime.runtime; print('ok')"
```

- [ ] **Step 2: Run the command to verify it fails**

Run: `cd runtime/python && uv run python -c "import rpa_runtime.runtime; print('ok')"`

Expected: fail before the packaging metadata is added, or fail to install the local project if `uv` cannot interpret the directory as a project.

- [ ] **Step 3: Add the minimal project metadata**

Update `runtime/python/pyproject.toml` to this shape:

```toml
[build-system]
requires = ["setuptools>=69", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "rpa-runtime"
version = "0.1.0"
requires-python = ">=3.14"

[tool.setuptools.packages.find]
where = ["."]
include = ["rpa_runtime*"]

[tool.pytest.ini_options]
pythonpath = ["."]
```

- [ ] **Step 4: Run the command to verify it passes**

Run:

```bash
cd runtime/python
uv sync
uv run python -c "import rpa_runtime.runtime; print('ok')"
uv run python -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: `uv sync` completes, the import prints `ok`, and the unittest suite passes.

### Task 2: Confirm the runtime still behaves the same under `uv`

**Files:**
- No code changes expected

- [ ] **Step 1: Run the existing runtime tests under `uv`**

Run:

```bash
cd runtime/python
uv run python -m unittest discover -s tests -p 'test_*.py' -v
```

Expected: all current tests pass with the same behavior as before.

- [ ] **Step 2: Sanity-check the module entry path**

Run:

```bash
cd runtime/python
uv run python - <<'PY'
from rpa_runtime.runtime import WorkflowRuntime
print(WorkflowRuntime().call_block("core.log", {"message": "ok"}))
PY
```

Expected: the command prints `ok` from the runtime block and returns `None`.

