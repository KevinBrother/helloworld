import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CreateNodeModal } from "./CreateNodeModal";

describe("CreateNodeModal", () => {
  it("shows create feedback inside the modal", () => {
    const html = renderToStaticMarkup(
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

  it("shows pending state on the confirm action", () => {
    const html = renderToStaticMarkup(
      <CreateNodeModal blocks={[]} pending={true} onClose={() => undefined} onConfirm={() => undefined} />,
    );

    expect(html).toContain("新增中");
  });
});
