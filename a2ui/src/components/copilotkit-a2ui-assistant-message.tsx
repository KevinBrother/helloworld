"use client";

import type { CopilotChatAssistantMessageProps } from "@copilotkit/react-core/v2";
import { parseA2uiPayload } from "@/lib/a2ui/parse-payload";
import { A2uiCardList } from "./a2ui-card-list";

export function CopilotkitA2uiAssistantMessage(
  props: CopilotChatAssistantMessageProps,
) {
  const content =
    typeof props.message.content === "string" ? props.message.content : "";
  const payload = parseA2uiPayload(content);

  if (!payload) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        {content}
      </div>
    );
  }

  return (
    <A2uiCardList
      payload={payload}
      title="Rendered by CopilotKit messageView"
    />
  );
}
