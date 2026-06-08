import type { SaveState } from "./workbench/components/Header";

export type RunAvailability = {
  available: boolean;
  message: string;
};

export function getRunAvailability(serverAvailable: boolean, saveState: SaveState): RunAvailability {
  if (!serverAvailable) {
    return {
      available: false,
      message: "启动流程服务后才能运行。",
    };
  }

  return {
    available: true,
    message: saveState === "saved" ? "在服务端运行当前流程。" : "运行前会自动同步本地草稿。",
  };
}
