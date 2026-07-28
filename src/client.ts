import {
  ReniecSunatApiError,
  ReniecSunatClientError,
  ReniecSunatNetworkError,
  ReniecSunatTimeoutError,
  ReniecSunatValidationError
} from "./errors";
import type {
  ApiResponse,
  ClientOptions,
  Company,
  DailyExchangeRateLookup,
  FetchLike,
  Health,
  MonthlyExchangeRateLookup,
  Person,
  RequestOptions
} from "./types";

export const DEFAULT_BASE_URL =
  "https://api-reniec-sunat.destiny-peru.com";

const DEFAULT_TIMEOUT_MS = 30_000;

export class ReniecSunatClient {
  readonly baseUrl: string;
  readonly timeoutMs: number;

  private readonly defaultHeaders: Headers;
  private readonly fetcher: FetchLike;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.timeoutMs = normalizeTimeout(options.timeoutMs);
    this.fetcher = options.fetch ?? globalThis.fetch;

    if (typeof this.fetcher !== "function") {
      throw new ReniecSunatClientError(
        "No fetch implementation is available. Use Node.js 20+ or provide options.fetch."
      );
    }

    this.defaultHeaders = new Headers(options.headers);
    if (!this.defaultHeaders.has("Accept")) {
      this.defaultHeaders.set("Accept", "application/json");
    }
    if (!this.defaultHeaders.has("User-Agent")) {
      this.defaultHeaders.set(
        "User-Agent",
        "@destiny-peru/reniec-sunat-client/0.1"
      );
    }

    const bearerToken = options.bearerToken?.trim();
    if (bearerToken) {
      this.defaultHeaders.set("Authorization", `Bearer ${bearerToken}`);
    }
  }

  async health(options?: RequestOptions): Promise<Health> {
    return await this.get("/health", options);
  }

  async getPersonByDni(
    dni: string,
    options?: RequestOptions
  ): Promise<Person> {
    return await this.get(
      `/api/v1/persons/${encodeURIComponent(validateDni(dni))}`,
      options
    );
  }

  async getCompanyByRuc(
    ruc: string,
    options?: RequestOptions
  ): Promise<Company> {
    return await this.get(
      `/api/v1/companies/${encodeURIComponent(validateRuc(ruc))}`,
      options
    );
  }

  async getTodayExchangeRate(
    options?: RequestOptions
  ): Promise<DailyExchangeRateLookup> {
    return await this.get("/api/v1/exchange-rates/today", options);
  }

  async getExchangeRateByDate(
    date: string,
    options?: RequestOptions
  ): Promise<DailyExchangeRateLookup> {
    const normalizedDate = validateIsoDate(date);
    return await this.get(
      `/api/v1/exchange-rates?date=${encodeURIComponent(normalizedDate)}`,
      options
    );
  }

  async getExchangeRatesByMonth(
    year: number,
    month: number,
    options?: RequestOptions
  ): Promise<MonthlyExchangeRateLookup> {
    validateYearMonth(year, month);
    return await this.get(
      `/api/v1/exchange-rates?year=${year}&month=${month}`,
      options
    );
  }

  private async get<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const headers = new Headers(this.defaultHeaders);
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    const abortFromCaller = () => controller.abort(options.signal?.reason);
    if (options.signal) {
      if (options.signal.aborted) {
        abortFromCaller();
      } else {
        options.signal.addEventListener("abort", abortFromCaller, {
          once: true
        });
      }
    }

    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: "GET",
        headers,
        signal: controller.signal
      });
      const envelope = await parseEnvelope<T>(response);

      if (!response.ok) {
        throw ReniecSunatApiError.fromResponse(
          response.status,
          response.statusText,
          envelope
        );
      }
      if (!envelope || envelope.data === null || envelope.data === undefined) {
        throw new ReniecSunatClientError(
          "The API returned a successful response without data."
        );
      }

      return envelope.data;
    } catch (error) {
      if (error instanceof ReniecSunatClientError) {
        throw error;
      }
      if (timedOut) {
        throw new ReniecSunatTimeoutError(this.timeoutMs, { cause: error });
      }
      if (options.signal?.aborted) {
        throw new ReniecSunatClientError("Request was aborted.", {
          cause: error
        });
      }
      throw new ReniecSunatNetworkError(
        "Could not reach the RENIEC SUNAT API.",
        { cause: error }
      );
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

export function createReniecSunatClient(
  options?: ClientOptions
): ReniecSunatClient {
  return new ReniecSunatClient(options);
}

async function parseEnvelope<T>(
  response: Response
): Promise<ApiResponse<T> | undefined> {
  const raw = await response.text();
  if (!raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as ApiResponse<T>;
  } catch (error) {
    if (!response.ok) {
      throw ReniecSunatApiError.fromResponse(
        response.status,
        response.statusText
      );
    }
    throw new ReniecSunatClientError(
      "The API returned an invalid JSON response.",
      { cause: error }
    );
  }
}

function normalizeBaseUrl(baseUrl?: string): string {
  const value = baseUrl?.trim() || DEFAULT_BASE_URL;
  try {
    const url = new URL(value);
    return url.toString().replace(/\/+$/, "");
  } catch (error) {
    throw new ReniecSunatValidationError(`Invalid base URL: ${value}`, {
      cause: error
    });
  }
}

function normalizeTimeout(timeoutMs?: number): number {
  if (timeoutMs === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ReniecSunatValidationError(
      "timeoutMs must be a positive number."
    );
  }
  return timeoutMs;
}

function validateDni(dni: string): string {
  const value = dni.trim();
  if (!/^\d{8}$/.test(value)) {
    throw new ReniecSunatValidationError("DNI must contain exactly 8 digits.");
  }
  return value;
}

function validateRuc(ruc: string): string {
  const value = ruc.trim();
  if (!/^\d{11}$/.test(value)) {
    throw new ReniecSunatValidationError("RUC must contain exactly 11 digits.");
  }
  return value;
}

function validateIsoDate(date: string): string {
  const value = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ReniecSunatValidationError(
      "Date must use the YYYY-MM-DD format."
    );
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ReniecSunatValidationError("Date is not valid.");
  }
  return value;
}

function validateYearMonth(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new ReniecSunatValidationError(
      "Year must be an integer between 1900 and 2100."
    );
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ReniecSunatValidationError(
      "Month must be an integer between 1 and 12."
    );
  }
}
