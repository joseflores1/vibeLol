import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { createRateLimiter } from '../lib/rate-limiter.js';
import type { RiotCluster, RiotRegion } from '../constants/regions.js';

// Routing values live in constants/regions.js (single source of truth —
// validators and services import from there too). Re-exported here so the
// riot layer's public surface stays stable for its consumers.
export type { RiotCluster, RiotRegion };

// Either routing value works in the URL host — Riot's API just uses the
// routing value as the subdomain of api.riotgames.com.
export type RiotRouting = RiotCluster | RiotRegion;

// Minimal shape of a Riot API error payload: { status: { message }, ... }
interface RiotErrorPayload {
  status?: { message?: string; status_code?: number };
  message?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rateLimiter = createRateLimiter(env.riotRateLimitPer100s);

// Builds the full URL for a given routing value + path (path starts with "/").
function buildUrl(routing: RiotRouting, path: string): string {
  return `https://${routing}.api.riotgames.com${path}`;
}

// Parses a Riot error response body into a human-readable message.
function describeError(status: number, body: unknown): string {
  const payload = body as RiotErrorPayload | undefined;
  const message =
    payload?.status?.message ?? payload?.message ?? 'Unknown Riot API error';
  return `Riot API ${status}: ${message}`;
}

async function request<T>(routing: RiotRouting, path: string): Promise<T> {
  const url = buildUrl(routing, path);
  const headers = { 'X-Riot-Token': env.riotApiKey };

  for (let attempt = 0; ; attempt += 1) {
    await rateLimiter.acquire();
    const res = await fetch(url, { headers });

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= env.riotMaxRetries) {
      return handleResponse<T>(res);
    }

    const retryAfter = res.status === 429
      ? Number(res.headers.get('Retry-After') ?? 1)
      : Number.NaN;
    const delay = Number.isFinite(retryAfter) && retryAfter >= 0
      ? retryAfter * 1000
      : Math.min(1000 * (2 ** attempt), 16_000);
    await sleep(delay);
  }
}

// Maps an HTTP response into typed data or an ApiError. 404 → notFound.
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    // 204 No Content (rare for Riot, but be safe) → return empty object.
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }

  if (res.status === 404) {
    throw ApiError.notFound(describeError(res.status, body));
  }
  if (res.status === 401 || res.status === 403) {
    throw ApiError.unauthorized(describeError(res.status, body));
  }
  if (res.status === 429) {
    // Still rate-limited after all configured retries — surface as 429.
    return Promise.reject(
      new ApiError(429, describeError(res.status, body)),
    );
  }
  // 5xx and anything else: pass through with Riot's status so clients can react.
  throw new ApiError(res.status, describeError(res.status, body));
}

// Public entry point used by riot/*.api.ts files.
export async function riotGet<T>(routing: RiotRouting, path: string): Promise<T> {
  return request<T>(routing, path);
}
