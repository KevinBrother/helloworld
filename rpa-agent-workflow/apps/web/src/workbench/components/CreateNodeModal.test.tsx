/* @vitest-environment jsdom */

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { CreateNodeModal } from "./CreateNodeModal";

describe("CreateNodeModal", () => {
  it("shows create feedback inside the modal", async () => {
    const html = await renderClientMarkup(
      <CreateNodeModal
        blocks={[]}
        feedback="新增失败：请先保存本地草稿"
        pending={false}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(html).toContain("新增失败：请先保存本地草稿");
  });

  it("shows pending state on the confirm action", async () => {
    const html = await renderClientMarkup(
      <CreateNodeModal blocks={[]} pending={true} onClose={() => undefined} onConfirm={() => undefined} />,
    );

    expect(html).toContain("新增中");
  });
});

async function renderClientMarkup(element: ReactElement) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const html = document.body.innerHTML;
  await act(async () => {
    root.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  host.remove();
  document.body.innerHTML = "";
  return html;
}
