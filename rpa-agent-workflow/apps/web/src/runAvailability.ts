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

  if (saveState !== "saved") {
    return {
      available: false,
      message: "当前工作流未同步到服务端，不能测试运行。",
    };
  }

  return {
    available: true,
    message: "在服务端运行当前流程。",
  };
}
