import { describe, expect, it } from "vitest";
import { parseValueComboInput } from "./ValueComboInput";

describe("parseValueComboInput", () => {
  it("rejects blank and non-numeric number input before it reaches the workflow service", () => {
    expect(parseValueComboInput("", "number")).toEqual({ ok: false, error: "必须是数字" });
    expect(parseValueComboInput("abc", "number")).toEqual({ ok: false, error: "必须是数字" });
  });

  it("parses valid number input", () => {
    expect(parseValueComboInput("20", "number")).toEqual({ ok: true, value: 20 });
  });
});
