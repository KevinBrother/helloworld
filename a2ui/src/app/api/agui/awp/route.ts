import { NextResponse } from "next/server";
import { generateA2uiPayload } from "@/lib/a2ui/generate-cards";
import { getLastUserMessage, type RunAgentInput } from "@/lib/agui/run-agent-input";
import { sseEvent } from "@/lib/agui/sse";

export async function POST(request: Request) {
  const input = (await request.json()) as RunAgentInput;
  const threadId = input.threadId ?? "thread-default";
  const runId = input.runId ?? "run-default";
  const lastUserMessage = getLastUserMessage(input);

  if (!lastUserMessage?.content) {
    return NextResponse.json({ error: "Missing user message" }, { status: 400 });
  }

  const payload = generateA2uiPayload(lastUserMessage.content);
  const messageId = `assistant-${runId}`;
  const messageContent = JSON.stringify(payload);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          sseEvent({
            type: "RUN_STARTED",
            threadId,
            runId,
          }),
        ),
      );
      controller.enqueue(
        encoder.encode(
          sseEvent({
            type: "TEXT_MESSAGE_START",
            messageId,
            role: "assistant",
          }),
        ),
      );
      controller.enqueue(
        encoder.encode(
          sseEvent({
            type: "TEXT_MESSAGE_CONTENT",
            messageId,
            delta: messageContent,
          }),
        ),
      );
      controller.enqueue(
        encoder.encode(
          sseEvent({
            type: "TEXT_MESSAGE_END",
            messageId,
          }),
        ),
      );
      controller.enqueue(
        encoder.encode(
          sseEvent({
            type: "RUN_FINISHED",
            threadId,
            runId,
            result: payload,
          }),
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
