import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/basic-form", () => {
  it("returns 400 when value is blank", async () => {
    const request = new Request("http://localhost/api/basic-form", {
      method: "POST",
      body: JSON.stringify({ value: "   " }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Please enter a value." });
  });

  it("echoes the submitted value", async () => {
    const request = new Request("http://localhost/api/basic-form", {
      method: "POST",
      body: JSON.stringify({ value: "hello from client" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: "hello from client" });
  });
});
