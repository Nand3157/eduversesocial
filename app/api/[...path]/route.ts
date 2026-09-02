import { problemResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function notFound(request: Request) {
  return problemResponse(
    404,
    "API_ENDPOINT_NOT_FOUND",
    "This API endpoint does not exist.",
    "Read /openapi.json or /developers to find supported endpoints.",
    request
  );
}

function methodNotAllowed(request: Request) {
  const response = problemResponse(
    405,
    "API_METHOD_NOT_ALLOWED",
    "This HTTP method is not supported here.",
    "Use a method listed in /openapi.json.",
    request
  );
  response.headers.set("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
  return response;
}

export const GET = notFound;
export const POST = notFound;
export const PUT = methodNotAllowed;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = methodNotAllowed;
