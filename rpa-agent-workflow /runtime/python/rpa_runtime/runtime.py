import asyncio


class WorkflowRuntime:
    def __init__(self):
        self.trace_events = []

    async def run_workflow(self, body):
        self.emit("workflow.start", {"statement": body.get("id")})
        result = await self.run_statement(body)
        self.emit("workflow.end", {"statement": body.get("id")})
        return result

    async def run_statement(self, statement):
        kind = statement.get("kind")
        statement_id = statement.get("id")
        self.emit("statement.start", {"id": statement_id, "kind": kind})
        try:
            if kind == "sequence":
                result = None
                for child in statement.get("statements", []):
                    result = await self.run_statement(child)
                return result
            if kind == "parallel":
                tasks = [
                    self.run_branch(branch)
                    for branch in statement.get("branches", [])
                ]
                return await asyncio.gather(*tasks)
            if kind == "callBlock":
                return self.call_block(
                    statement["block"],
                    {
                        key: self.evaluate_expression(value)
                        for key, value in statement.get("inputs", {}).items()
                    },
                )
            raise ValueError(f"unsupported statement kind: {kind}")
        finally:
            self.emit("statement.end", {"id": statement_id, "kind": kind})

    async def run_branch(self, branch):
        branch_id = branch.get("id")
        self.emit("branch.start", {"id": branch_id})
        try:
            result = None
            for statement in branch.get("body", []):
                result = await self.run_statement(statement)
            return result
        finally:
            self.emit("branch.end", {"id": branch_id})

    def call_block(self, name, inputs):
        if name == "core.log":
            from .blocks.core import log

            return log(inputs.get("message"))
        if name == "system.get_os_info":
            from .blocks.system import get_os_info

            return get_os_info()
        raise KeyError(name)

    def emit(self, event, payload):
        self.trace_events.append({"event": event, "payload": payload})

    def evaluate_expression(self, expression):
        kind = expression.get("kind")
        if kind == "literal":
            return expression.get("value")
        if kind == "ref":
            raise NotImplementedError("references are not implemented yet")
        return expression
