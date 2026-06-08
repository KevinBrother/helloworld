import { describe, expect, it } from "vitest";
import { getRunAvailability } from "./runAvailability";

describe("getRunAvailability", () => {
  it("allows runs when the workflow service is available", () => {
    expect(getRunAvailability(true, "saved")).toEqual({
      available: true,
      message: "在服务端运行当前流程。",
    });

    expect(getRunAvailability(true, "sample")).toEqual({
      available: true,
      message: "运行前会自动同步本地草稿。",
    });
  });

  it("blocks runs when the workflow service is unavailable", () => {
    expect(getRunAvailability(false, "saved")).toEqual({
      available: false,
      message: "启动流程服务后才能运行。",
    });
  });
});
