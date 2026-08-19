export type MetaErrorCode = "META_AUTH_ERROR" | "META_PERMISSION_ERROR" | "META_RATE_LIMIT" | "META_INVALID_MEDIA" | "META_ACCOUNT_ERROR" | "META_API_ERROR" | "META_TIMEOUT" | "META_UNKNOWN_ERROR";

export class MetaError extends Error {
  constructor(public code: MetaErrorCode, message: string, public retryAfter?: number) {
    super(message);
  }
}
