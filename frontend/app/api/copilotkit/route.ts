import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

export const POST = async (req: Request) => {
  const runtime = new CopilotRuntime({
    remoteEndpoints: [
      {
        url: process.env.BACKEND_COPILOTKIT_URL || "http://localhost:8000/copilotkit",
      },
    ],
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
