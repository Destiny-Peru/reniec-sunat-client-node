import type { ApiErrorDetail } from "./types";

export class ReniecSunatClientError extends Error {
  override readonly name: string = "ReniecSunatClientError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ReniecSunatValidationError extends ReniecSunatClientError {
  override readonly name = "ReniecSunatValidationError";
}

export class ReniecSunatTimeoutError extends ReniecSunatClientError {
  override readonly name = "ReniecSunatTimeoutError";

  constructor(readonly timeoutMs: number, options?: ErrorOptions) {
    super(`Request timed out after ${timeoutMs} ms.`, options);
  }
}

export class ReniecSunatNetworkError extends ReniecSunatClientError {
  override readonly name = "ReniecSunatNetworkError";
}

export class ReniecSunatApiError extends ReniecSunatClientError {
  override readonly name = "ReniecSunatApiError";

  constructor(
    readonly statusCode: number,
    message: string,
    readonly code = "",
    readonly requestId = "",
    readonly path = "",
    readonly details?: unknown
  ) {
    super(message || `RENIEC SUNAT API returned HTTP ${statusCode}.`);
  }

  get isBadRequest(): boolean {
    return this.statusCode === 400;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isBadGateway(): boolean {
    return this.statusCode === 502;
  }

  get isServiceUnavailable(): boolean {
    return this.statusCode === 503;
  }

  static fromResponse(
    statusCode: number,
    statusText: string,
    envelope?: {
      message?: string;
      requestId?: string;
      path?: string;
      error?: ApiErrorDetail | null;
    }
  ): ReniecSunatApiError {
    return new ReniecSunatApiError(
      statusCode,
      envelope?.error?.message || envelope?.message || statusText,
      envelope?.error?.code,
      envelope?.requestId,
      envelope?.path,
      envelope?.error?.details
    );
  }
}
