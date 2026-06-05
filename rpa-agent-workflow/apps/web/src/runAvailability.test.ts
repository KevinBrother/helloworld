import { describe, expect, it } from "vitest";
import { getRunAvailability } from "./runAvailability";

describe("getRunAvailability", () => {
  it("allows runs only when the browser projection is saved to the workflow service", () => {
    expect(getRunAvailability(true, "saved")).toEqual({
      available: true,
      message: "在服务端运行当前流程。",
    });

    expect(getRunAvailability(true, "sample")).toEqual({
      available: false,
      message: "当前 UI JSON 未同步到服务端 AST，不能测试运行。",
    });
  });

  it("blocks runs when the workflow service is unavailable", () => {
    expect(getRunAvailability(false, "saved")).toEqual({
      available: false,
      message: "启动流程服务后才能运行。",
    });
  });
});
