import asyncio
import copy


class WorkflowRuntime:
    def __init__(self, blocks=None, workflows=None):
        self.trace_events = []
        self.variables = {}
        self.blocks = blocks or {}
        self.workflows = workflows or {}

    async def run_workflow(self, body, workflow_inputs=None):
        workflow_inputs = workflow_inputs or {}
        self.emit("workflow.start", {"statement": body.get("id")})
        result = await self.run_statement(body, workflow_inputs)
        self.emit("workflow.end", {"statement": body.get("id")})
        return result

    async def run_statement(self, statement, scope=None):
        scope = scope or {}
        kind = statement.get("kind")
        statement_id = statement.get("id")
        self.emit("statement.start", {"id": statement_id, "kind": kind})
        try:
            if kind == "sequence":
                result = None
                for child in statement.get("statements", []):
                    result = await self.run_statement(child, scope)
                return result
            if kind == "parallel":
                return await self.run_parallel(statement, scope)
            if kind == "callBlock":
                return self.call_block(
                    statement["block"],
                    {
                        key: self.evaluate_expression(value, scope)
                        for key, value in statement.get("inputs", {}).items()
                    },
                )
            if kind == "assign":
                value = self.evaluate_expression(statement.get("value"), scope)
                self.variables[statement["target"]] = value
                self.emit("variable.write", {"name": statement["target"]})
                return value
            if kind == "if":
                if self.evaluate_expression(statement.get("condition"), scope):
                    return await self.run_statement(
                        {"id": statement_id + ".then", "kind": "sequence", "statements": statement.get("then", [])},
                        scope,
                    )
                return await self.run_statement(
                    {"id": statement_id + ".else", "kind": "sequence", "statements": statement.get("else", [])},
                    scope,
                )
            if kind == "loop":
                return await self.run_loop(statement, scope)
            if kind == "try":
                return await self.run_try(statement, scope)
            if kind == "callWorkflow":
                workflow = self.workflows[statement["workflow"]]
                child_scope = dict(scope)
                child_scope.update(
                    {
                        key: self.evaluate_expression(value, scope)
                        for key, value in statement.get("inputs", {}).items()
                    }
                )
                return await self.run_statement(workflow["body"], child_scope)
            if kind == "return":
                return {
                    key: self.evaluate_expression(value, scope)
                    for key, value in statement.get("returns", {}).items()
                }
            raise ValueError(f"unsupported statement kind: {kind}")
        finally:
            self.emit("statement.end", {"id": statement_id, "kind": kind})

    async def run_parallel(self, statement, scope):
        branches = statement.get("branches", [])
        join = statement.get("join") or {}
        if self.has_parallel_write_conflict(statement, scope):
            raise ValueError("parallel write conflict")
        tasks = [self.run_branch(branch, scope) for branch in branches]
        if join.get("strategy", "all") == "all":
            return await asyncio.gather(*tasks)
        if join.get("strategy") == "any":
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
            return [task.result() for task in done]
        return await asyncio.gather(*tasks)

    async def run_branch(self, branch, parent_scope):
        branch_id = branch.get("id")
        self.emit("branch.start", {"id": branch_id})
        try:
            scope = copy.deepcopy(parent_scope)
            result = None
            for statement in branch.get("body", []):
                result = await self.run_statement(statement, scope)
            return result
        finally:
            self.emit("branch.end", {"id": branch_id})

    async def run_loop(self, statement, scope):
        loop_kind = statement.get("loopKind", "while")
        if loop_kind == "while":
            result = None
            while self.evaluate_expression(statement.get("condition"), scope):
                result = await self.run_statement(
                    {"id": statement["id"] + ".body", "kind": "sequence", "statements": statement.get("statements", [])},
                    scope,
                )
            return result
        if loop_kind == "foreach":
            result = None
            for item in self.evaluate_expression(statement.get("iterable"), scope) or []:
                loop_scope = dict(scope)
                loop_scope[statement.get("itemVar", "item")] = item
                result = await self.run_statement(
                    {"id": statement["id"] + ".body", "kind": "sequence", "statements": statement.get("statements", [])},
                    loop_scope,
                )
            return result
        raise ValueError(f"unsupported loop kind: {loop_kind}")

    async def run_try(self, statement, scope):
        try:
            result = await self.run_statement(
                {"id": statement["id"] + ".body", "kind": "sequence", "statements": statement.get("statements", [])},
                scope,
            )
        except Exception as exc:  # noqa: BLE001
            for clause in statement.get("catches", []):
                if clause.get("pattern") in ("*", type(exc).__name__, str(exc)):
                    return await self.run_statement(
                        {"id": statement["id"] + ".catch", "kind": "sequence", "statements": clause.get("body", [])},
                        scope,
                    )
            raise
        finally:
            final_body = statement.get("finally", [])
            if final_body:
                await self.run_statement(
                    {"id": statement["id"] + ".finally", "kind": "sequence", "statements": final_body},
                    scope,
                )
        return result

    def has_parallel_write_conflict(self, statement, scope):
        shared = set()
        for branch in statement.get("branches", []):
            for child in branch.get("body", []):
                if child.get("kind") == "assign":
                    target = child.get("target")
                    if target in self.variables:
                        if target in shared:
                            return True
                        shared.add(target)
        return False

    def call_block(self, name, inputs):
        binding = self.blocks.get(name)
        if binding:
            func = self.resolve_binding(binding)
            return func(**inputs)
        if name == "core.log":
            from .blocks.core.log import log
            return log(**inputs)
        if name == "system.get_os_info":
            from .blocks.system.get_os_info import get_os_info
            return get_os_info(**inputs)
        if name == "math.calculate":
            from .blocks.math.calculate import calculate
            return calculate(**inputs)
        raise KeyError(name)

    def resolve_binding(self, binding):
        import importlib

        if binding.get("target") != "python":
            raise ValueError(f"unsupported runtime target: {binding.get('target')}")
        module = importlib.import_module(binding["module"])
        return getattr(module, binding["callable"])

    def emit(self, event, payload):
        self.trace_events.append({"event": event, "payload": payload})

    def evaluate_expression(self, expression, scope=None):
        scope = scope or {}
        if expression is None:
            return None
        if isinstance(expression, (str, int, float, bool)):
            return expression
        kind = expression.get("kind")
        if kind == "literal":
            return expression.get("value")
        if kind == "ref":
            ref = expression.get("ref", "")
            if ref.startswith("var."):
                return self.variables.get(ref.split(".", 1)[1])
            if ref.startswith("input."):
                return scope.get(ref.split(".", 1)[1])
            return scope.get(ref)
        if kind == "binary":
            left = self.evaluate_expression(expression.get("left"), scope)
            right = self.evaluate_expression(expression.get("right"), scope)
            op = expression.get("op")
            if op == "+":
                return left + right
            if op == "==":
                return left == right
            if op == "!=":
                return left != right
            if op == "<":
                return left < right
            if op == ">":
                return left > right
        if kind == "array":
            return [self.evaluate_expression(item, scope) for item in expression.get("items", [])]
        if kind == "object":
            return {
                key: self.evaluate_expression(value, scope)
                for key, value in expression.get("fields", {}).items()
            }
        if kind == "template":
            return "".join(str(self.evaluate_expression(item, scope)) for item in expression.get("items", []))
        return expression
