import asyncio
import importlib
import tempfile
from pathlib import Path
import unittest

from rpa_sdk.runtime import WorkflowRuntime


class RuntimeTest(unittest.TestCase):
    def test_block_implementations_use_namespace_directories(self):
        self.assertTrue(hasattr(importlib.import_module("rpa_sdk.blocks.core.log"), "log"))
        self.assertTrue(hasattr(importlib.import_module("rpa_sdk.blocks.fs.list"), "list_entries"))
        self.assertTrue(hasattr(importlib.import_module("rpa_sdk.blocks.fs.read_text"), "read_text"))
        self.assertTrue(hasattr(importlib.import_module("rpa_sdk.blocks.fs.write_text"), "write_text"))
        self.assertTrue(hasattr(importlib.import_module("rpa_sdk.blocks.math.calculate"), "calculate"))
        self.assertTrue(hasattr(importlib.import_module("rpa_sdk.blocks.system.get_os_info"), "get_os_info"))

    def test_math_calculate_block_supports_arithmetic(self):
        runtime = WorkflowRuntime()

        self.assertEqual(runtime.call_block("math.calculate", {"left": 7, "operator": "+", "right": 3}), {"result": 10})
        self.assertEqual(runtime.call_block("math.calculate", {"left": 7, "operator": "-", "right": 3}), {"result": 4})
        self.assertEqual(runtime.call_block("math.calculate", {"left": 7, "operator": "*", "right": 3}), {"result": 21})
        self.assertEqual(runtime.call_block("math.calculate", {"left": 7, "operator": "/", "right": 2}), {"result": 3.5})

    def test_math_calculate_block_rejects_division_by_zero(self):
        runtime = WorkflowRuntime()

        with self.assertRaisesRegex(ZeroDivisionError, "division by zero"):
            runtime.call_block("math.calculate", {"left": 7, "operator": "/", "right": 0})

    def test_fs_blocks_list_read_and_write_text(self):
        list_entries = importlib.import_module("rpa_sdk.blocks.fs.list").list_entries
        read_text = importlib.import_module("rpa_sdk.blocks.fs.read_text").read_text
        write_text = importlib.import_module("rpa_sdk.blocks.fs.write_text").write_text

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "source.txt"
            nested = root / "nested"
            nested.mkdir()
            source.write_text("hello", encoding="utf-8")
            (nested / "ignored.txt").write_text("nested", encoding="utf-8")

            entries = list_entries(path=str(root), recursive=False)
            self.assertEqual(entries["count"], 2)
            self.assertEqual(
                sorted((entry["name"], entry["type"]) for entry in entries["entries"]),
                [("nested", "directory"), ("source.txt", "file")],
            )

            content = read_text(path=str(source))
            self.assertEqual(content, {"path": str(source), "text": "hello", "bytes": 5})

            with self.assertRaisesRegex(IsADirectoryError, "path must be a file"):
                read_text(path=str(root))

            output_path = root / "out" / "result.txt"
            write_result = write_text(path=str(output_path), text="done", createDirs=True)
            self.assertEqual(write_result, {"path": str(output_path), "bytes": 4})
            self.assertEqual(output_path.read_text(encoding="utf-8"), "done")

    def test_workflow_can_call_fs_blocks_through_runtime_bindings(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = str(Path(temp_dir) / "result.txt")
            runtime = WorkflowRuntime(
                blocks={
                    "fs.write_text": {
                        "target": "python",
                        "module": "rpa_sdk.blocks.fs.write_text",
                        "callable": "write_text",
                        "mode": "sync",
                    },
                    "fs.read_text": {
                        "target": "python",
                        "module": "rpa_sdk.blocks.fs.read_text",
                        "callable": "read_text",
                        "mode": "sync",
                    },
                }
            )
            workflow = {
                "id": "root",
                "kind": "sequence",
                "statements": [
                    {
                        "id": "write_result",
                        "kind": "callBlock",
                        "block": "fs.write_text",
                        "inputs": {
                            "path": {"kind": "ref", "ref": "input.path"},
                            "text": {"kind": "literal", "value": "from workflow"},
                        },
                    },
                    {
                        "id": "read_result",
                        "kind": "callBlock",
                        "block": "fs.read_text",
                        "inputs": {
                            "path": {"kind": "ref", "ref": "node.write_result.path"},
                        },
                    },
                    {
                        "id": "return_result",
                        "kind": "return",
                        "returns": {
                            "text": {"kind": "ref", "ref": "node.read_result.text"},
                            "bytes": {"kind": "ref", "ref": "node.write_result.bytes"},
                        },
                    },
                ],
            }

            result = asyncio.run(runtime.run_workflow(workflow, {"path": output_path}))

            self.assertEqual(result, {"text": "from workflow", "bytes": 13})

    def test_log_block_runs(self):
        runtime = WorkflowRuntime()
        result = runtime.call_block("core.log", {"message": "hello"})
        self.assertIsNone(result)

    def test_literal_inputs_are_evaluated_before_block_call(self):
        runtime = WorkflowRuntime()
        result = asyncio.run(
            runtime.run_statement(
                {
                    "id": "literal_log",
                    "kind": "callBlock",
                    "block": "core.log",
                    "inputs": {
                        "message": {
                            "kind": "literal",
                            "value": "evaluated literal",
                        }
                    },
                }
            )
        )
        self.assertIsNone(result)

    def test_parallel_branches_emit_trace_events(self):
        runtime = WorkflowRuntime()
        workflow = {
            "id": "root",
            "kind": "parallel",
            "branches": [
                {
                    "id": "left",
                    "body": [
                        {
                            "id": "left_log",
                            "kind": "callBlock",
                            "block": "core.log",
                            "inputs": {"message": {"kind": "literal", "value": "left"}},
                        }
                    ],
                },
                {
                    "id": "right",
                    "body": [
                        {
                            "id": "right_log",
                            "kind": "callBlock",
                            "block": "core.log",
                            "inputs": {"message": {"kind": "literal", "value": "right"}},
                        }
                    ],
                },
            ],
        }

        result = asyncio.run(runtime.run_statement(workflow))
        self.assertEqual(result, [None, None])
        events = [event["event"] for event in runtime.trace_events]
        self.assertIn("branch.start", events)
        self.assertIn("branch.end", events)

    def test_assign_if_loop_try_return_and_workflow_call(self):
        runtime = WorkflowRuntime()
        runtime.workflows["child"] = {
            "body": {
                "id": "child_return",
                "kind": "return",
                "returns": {
                    "child": {
                        "kind": "literal",
                        "value": "ok",
                    }
                },
            }
        }
        workflow = {
            "id": "root",
            "kind": "sequence",
            "statements": [
                {
                    "id": "assign_count",
                    "kind": "assign",
                    "target": "count",
                    "value": {"kind": "literal", "value": 1},
                },
                {
                    "id": "if_stmt",
                    "kind": "if",
                    "condition": {"kind": "literal", "value": True},
                    "then": [
                        {
                            "id": "then_assign",
                            "kind": "assign",
                            "target": "branch",
                            "value": {"kind": "literal", "value": "then"},
                        }
                    ],
                    "else": [],
                },
                {
                    "id": "loop_stmt",
                    "kind": "loop",
                    "loopKind": "foreach",
                    "iterable": {
                        "kind": "array",
                        "items": [
                            {"kind": "literal", "value": "a"},
                            {"kind": "literal", "value": "b"},
                        ],
                    },
                    "itemVar": "item",
                    "statements": [
                        {
                            "id": "loop_assign",
                            "kind": "assign",
                            "target": "last",
                            "value": {"kind": "ref", "ref": "item"},
                        }
                    ],
                },
                {
                    "id": "try_stmt",
                    "kind": "try",
                    "statements": [],
                    "catches": [{"pattern": "*", "body": []}],
                    "finally": [
                        {
                            "id": "finally_assign",
                            "kind": "assign",
                            "target": "finally",
                            "value": {"kind": "literal", "value": True},
                        }
                    ],
                },
                {
                    "id": "child_call",
                    "kind": "callWorkflow",
                    "workflow": "child",
                    "inputs": {},
                },
                {
                    "id": "return_stmt",
                    "kind": "return",
                    "returns": {
                        "branch": {"kind": "ref", "ref": "var.branch"},
                        "last": {"kind": "ref", "ref": "var.last"},
                        "finally": {"kind": "ref", "ref": "var.finally"},
                    },
                },
            ],
        }

        result = asyncio.run(runtime.run_statement(workflow))
        self.assertEqual(result, {"branch": "then", "last": "b", "finally": True})

    def test_if_outputs_expose_branch_node_output_references(self):
        runtime = WorkflowRuntime()
        workflow = {
            "id": "root",
            "kind": "sequence",
            "statements": [
                {
                    "id": "branch_by_threshold",
                    "kind": "if",
                    "condition": {
                        "kind": "binary",
                        "op": ">",
                        "left": {"kind": "ref", "ref": "input.left"},
                        "right": {"kind": "literal", "value": 10},
                    },
                    "then": [
                        {
                            "id": "calculate_large_value",
                            "kind": "callBlock",
                            "block": "math.calculate",
                            "inputs": {
                                "left": {"kind": "ref", "ref": "input.left"},
                                "operator": {"kind": "ref", "ref": "input.operator"},
                                "right": {"kind": "ref", "ref": "input.right"},
                            },
                        }
                    ],
                    "else": [
                        {
                            "id": "calculate_small_value",
                            "kind": "callBlock",
                            "block": "math.calculate",
                            "inputs": {
                                "left": {"kind": "ref", "ref": "input.left"},
                                "operator": {"kind": "ref", "ref": "input.operator"},
                                "right": {"kind": "ref", "ref": "input.right"},
                            },
                        }
                    ],
                    "outputs": {
                        "result": {
                            "kind": "branch",
                            "fields": {
                                "then": {"kind": "ref", "ref": "node.calculate_large_value.result"},
                                "else": {"kind": "ref", "ref": "node.calculate_small_value.result"},
                            },
                        }
                    },
                },
                {
                    "id": "return_result",
                    "kind": "return",
                    "returns": {"result": {"kind": "ref", "ref": "node.branch_by_threshold.result"}},
                },
            ],
        }

        result = asyncio.run(
            runtime.run_workflow(
                workflow,
                {
                    "left": 30,
                    "operator": "+",
                    "right": 12,
                },
            )
        )

        self.assertEqual(result, {"result": 42})


if __name__ == "__main__":
    unittest.main()
