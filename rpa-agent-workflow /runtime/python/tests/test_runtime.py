import asyncio
import unittest

from rpa_runtime.runtime import WorkflowRuntime


class RuntimeTest(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
