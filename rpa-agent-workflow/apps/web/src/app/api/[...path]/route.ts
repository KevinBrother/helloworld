import type { NextRequest } from "next/server";

const DEFAULT_WORKFLOW_SERVICE_URL = "http://127.0.0.1:8787";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyWorkflowRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyWorkflowRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyWorkflowRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyWorkflowRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyWorkflowRequest(request, context);
}

async function proxyWorkflowRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const upstream = new URL(`/api/${path.join("/")}${request.nextUrl.search}`, workflowServiceBaseURL());
  const response = await fetch(upstream, {
    method: request.method,
    headers: forwardHeaders(request.headers),
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    duplex: "half",
  } as RequestInit);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders(response.headers),
  });
}

function workflowServiceBaseURL() {
  return process.env.WORKFLOW_SERVICE_URL ?? DEFAULT_WORKFLOW_SERVICE_URL;
}

function forwardHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete("host");
  return nextHeaders;
}

function responseHeaders(headers: Headers) {
  const nextHeaders = new Headers();
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      nextHeaders.set(key, value);
    }
  });
  return nextHeaders;
}
