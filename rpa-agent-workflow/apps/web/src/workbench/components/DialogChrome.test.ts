import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");

describe("Dialog chrome styles", () => {
  it("pins ui-components dialogs above the workbench instead of flowing in the page", () => {
    expect(styles).toMatch(/\[data-slot="dialog-overlay"\]\s*\{[\s\S]*position:\s*fixed/);
    expect(styles).toMatch(/\[data-slot="dialog-overlay"\]\s*\{[\s\S]*inset:\s*0/);
    expect(styles).toMatch(/\.run-modal,\s*\.node-edit-modal\s*\{[\s\S]*position:\s*fixed/);
    expect(styles).toMatch(/\.run-modal,\s*\.node-edit-modal\s*\{[\s\S]*transform:\s*translate\(-50%,\s*-50%\)/);
  });
});
