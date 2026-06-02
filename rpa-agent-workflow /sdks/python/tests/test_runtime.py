import asyncio
import importlib
import unittest

from rpa_sdk.runtime import WorkflowRuntime


class RuntimeTest(unittest.TestCase):
    def test_block_implementations_use_namespace_directories(self):
        self.assertTrue(hasattr(importlib.import_module("rpa_sdk.blocks.core.log"), "log"))
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


if __name__ == "__main__":
    unittest.main()
