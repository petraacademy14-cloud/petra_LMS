import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { captureError } = await import("@/lib/error-log");
  const requestIdHeader = request.headers["x-request-id"];
  const vercelIdHeader = request.headers["x-vercel-id"];
  const requestId = Array.isArray(requestIdHeader)
    ? requestIdHeader[0]
    : (requestIdHeader ??
      (Array.isArray(vercelIdHeader) ? vercelIdHeader[0] : vercelIdHeader));

  await captureError(error, {
    path: request.path,
    requestId,
    context: {
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource ?? null,
      revalidateReason: context.revalidateReason ?? null,
    },
  });
};
