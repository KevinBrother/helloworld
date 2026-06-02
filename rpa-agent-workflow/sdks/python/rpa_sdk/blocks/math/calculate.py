def calculate(left=None, operator=None, right=None, **_kwargs):
    if operator == "+":
        result = left + right
    elif operator == "-":
        result = left - right
    elif operator == "*":
        result = left * right
    elif operator == "/":
        if right == 0:
            raise ZeroDivisionError("division by zero")
        result = left / right
    else:
        raise ValueError(f"unsupported operator: {operator}")

    return {"result": result}
