import { Suspense } from "react";
import { WorkbenchApp } from "@/workbench/workbench-app";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="workbench-loading">正在连接流程服务。</main>}>
      <WorkbenchApp />
    </Suspense>
  );
}
