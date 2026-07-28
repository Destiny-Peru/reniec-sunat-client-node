export interface ApiErrorDetail {
  code?: string;
  message?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta?: unknown;
  error?: ApiErrorDetail | null;
  requestId?: string;
  path: string;
  timestamp: string;
}

export interface Health {
  status: string;
}

export interface Person {
  dni: string;
  firstNames: string;
  lastNames: string;
  birthDate?: string | null;
  verificationCode?: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EconomicActivity {
  kind: string;
  code: string;
  description: string;
}

export interface Establishment {
  address: string;
  department?: string;
  province?: string;
  district?: string;
  locationText?: string;
}

export interface LegalRepresentative {
  fullName: string;
  role?: string;
  since?: string | null;
}

export interface Company {
  ruc: string;
  businessName: string;
  taxpayerType?: string;
  tradeName?: string;
  registrationDate?: string | null;
  activityStartDate?: string | null;
  taxpayerStatus?: string;
  taxpayerCondition?: string;
  fiscalAddress?: string;
  department?: string;
  province?: string;
  district?: string;
  voucherIssuanceSystem?: string;
  foreignTradeActivity?: string;
  accountingSystem?: string;
  electronicIssuerSince?: string | null;
  pleSince?: string;
  printedVouchers?: string;
  electronicIssuanceSystem?: string;
  electronicVouchers?: string;
  registries?: string;
  ubigeo?: string;
  economicActivities?: EconomicActivity[];
  establishments?: Establishment[];
  legalRepresentatives?: LegalRepresentative[];
  source?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExchangeRate {
  date: string;
  buyPrice?: number;
  sellPrice?: number;
}

export interface DailyExchangeRateLookup {
  lookupType: "day";
  date: string;
  year: number;
  month: number;
  source: string;
  exchangeRate: ExchangeRate;
  exchangeRates?: never;
}

export interface MonthlyExchangeRateLookup {
  lookupType: "month";
  year: number;
  month: number;
  source: string;
  exchangeRates: ExchangeRate[];
  date?: never;
  exchangeRate?: never;
}

export type ExchangeRateLookup =
  | DailyExchangeRateLookup
  | MonthlyExchangeRateLookup;

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export interface ClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  headers?: HeadersInit;
  bearerToken?: string;
  fetch?: FetchLike;
}
