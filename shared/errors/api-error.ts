export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error("[api] unexpected error", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error." } },
    { status: 500 },
  );
}
