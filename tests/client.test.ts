import { describe, expect, it, vi } from "vitest";

import {
  ReniecSunatApiError,
  ReniecSunatClient,
  ReniecSunatTimeoutError,
  ReniecSunatValidationError
} from "../src";
import type { ApiResponse, FetchLike } from "../src";

function jsonResponse<T>(
  data: T,
  init: ResponseInit = {}
): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}

function envelope<T>(data: T, path: string): ApiResponse<T> {
  return {
    success: true,
    statusCode: 200,
    message: "ok",
    data,
    path,
    timestamp: "2026-07-28T00:00:00Z"
  };
}

describe("ReniecSunatClient", () => {
  it("uses the current health endpoint", async () => {
    const fetcher = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse(envelope({ status: "ok" }, "/health"))
    );
    const client = new ReniecSunatClient({
      baseUrl: "https://example.test/",
      fetch: fetcher
    });

    await expect(client.health()).resolves.toEqual({ status: "ok" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.test/health",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("gets a person using a normalized DNI", async () => {
    const person = {
      dni: "71101328",
      firstNames: "PATRICK STEEP",
      lastNames: "VIDAL MORI"
    };
    const fetcher = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse(envelope(person, "/api/v1/persons/71101328"))
    );
    const client = new ReniecSunatClient({
      baseUrl: "https://example.test",
      fetch: fetcher
    });

    await expect(client.getPersonByDni(" 71101328 ")).resolves.toEqual(person);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://example.test/api/v1/persons/71101328"
    );
  });

  it("maps API failures to ReniecSunatApiError", async () => {
    const fetcher = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse(
        {
          success: false,
          statusCode: 404,
          message: "company not found",
          data: null,
          error: {
            code: "COMPANY_NOT_FOUND",
            message: "company not found"
          },
          requestId: "request-123",
          path: "/api/v1/companies/20114052311",
          timestamp: "2026-07-28T00:00:00Z"
        },
        { status: 404, statusText: "Not Found" }
      )
    );
    const client = new ReniecSunatClient({
      baseUrl: "https://example.test",
      fetch: fetcher
    });

    const error = await client
      .getCompanyByRuc("20114052311")
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ReniecSunatApiError);
    expect(error).toMatchObject({
      statusCode: 404,
      code: "COMPANY_NOT_FOUND",
      requestId: "request-123",
      isNotFound: true
    });
  });

  it("validates identifiers before making a request", async () => {
    const fetcher = vi.fn<FetchLike>();
    const client = new ReniecSunatClient({ fetch: fetcher });

    await expect(client.getPersonByDni("123")).rejects.toBeInstanceOf(
      ReniecSunatValidationError
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("supports monthly exchange-rate lookups", async () => {
    const result = {
      lookupType: "month" as const,
      year: 2026,
      month: 7,
      source: "sunat",
      exchangeRates: [
        { date: "2026-07-01", buyPrice: 3.5, sellPrice: 3.52 }
      ]
    };
    const fetcher = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse(envelope(result, "/api/v1/exchange-rates"))
    );
    const client = new ReniecSunatClient({
      baseUrl: "https://example.test",
      fetch: fetcher
    });

    await expect(client.getExchangeRatesByMonth(2026, 7)).resolves.toEqual(
      result
    );
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://example.test/api/v1/exchange-rates?year=2026&month=7"
    );
  });

  it("raises a typed timeout error", async () => {
    const fetcher: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true }
        );
      });
    const client = new ReniecSunatClient({
      timeoutMs: 5,
      fetch: fetcher
    });

    await expect(client.health()).rejects.toBeInstanceOf(
      ReniecSunatTimeoutError
    );
  });
});
