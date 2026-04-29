import { NextRequest, NextResponse } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";

const AGENT_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/agui`
  : "http://localhost:3000/api/agui";

const runtime = new CopilotRuntime({
  agents: {
    "a2ui-fixed-schema": new HttpAgent({ url: AGENT_URL }),
    default: new HttpAgent({ url: AGENT_URL }),
  },
});

export async function POST(req: NextRequest) {
  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      endpoint: "/api/copilotkit-a2ui-fixed-schema",
      serviceAdapter: new ExperimentalEmptyAdapter(),
      runtime,
    });

    return await handleRequest(req);
  } catch (error) {
    console.error("[copilotkit-a2ui-fixed-schema]", error);
    return NextResponse.json(
      { error: "CopilotKit runtime error" },
      { status: 500 },
    );
  }
}
