import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/agui/awp", () => {
  it("returns a streaming response for valid messages", async () => {
    const request = new Request("http://localhost/api/agui/awp", {
      method: "POST",
      body: JSON.stringify({
        threadId: "thread-1",
        runId: "run-1",
        messages: [{ id: "msg-1", role: "user", content: "Explain a2ui" }],
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
  });
});
