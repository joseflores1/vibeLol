import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Riot regional platforms (account/match-level routing).
export type RiotPlatform = 'americas' | 'europe' | 'asia';

// Minimal shape of a Riot API error payload: { status: { message }, ... }
interface RiotErrorPayload {
  status?: { message?: string; status_code?: number };
  message?: string;
}

// Sleep helper —Honors Riot's Retry-After header (in seconds) on 429s.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Builds the full URL for a given platform + path (path already starts with "/").
function buildUrl(platform: RiotPlatform, path: string): string {
  return `https://${platform}.api.riotgames.com${path}`;
}

// Parses a Riot error response body into a human-readable message.
function describeError(status: number, body: unknown): string {
  const payload = body as RiotErrorPayload | undefined;
  const message =
    payload?.status?.message ?? payload?.message ?? 'Unknown Riot API error';
  return `Riot API ${status}: ${message}`;
}

// Core request runner. Sends X-Riot-Token, retries once on 429 honoring
// Retry-After, and throws ApiError for any non-2xx outcome. Pure HTTP —
// no Prisma, no business logic — so the Riot layer stays mockable.
async function request<T>(platform: RiotPlatform, path: string): Promise<T> {
  const url = buildUrl(platform, path);
  const headers = { 'X-Riot-Token': env.riotApiKey };

  const run = async (): Promise<T> => {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      // Riot requires honoring Retry-After (seconds); retry once after the wait.
      const retryAfter = Number(res.headers.get('Retry-After') ?? 1);
      await sleep(retryAfter * 1000);
      const retryRes = await fetch(url, { headers });
      return handleResponse<T>(retryRes);
    }
    return handleResponse<T>(res);
  };

  return run();
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
    // Still rate-limited after the single retry — surface as a 429 to clients.
    return Promise.reject(
      new ApiError(429, describeError(res.status, body)),
    );
  }
  // 5xx and anything else: pass through with Riot's status so clients can react.
  throw new ApiError(res.status, describeError(res.status, body));
}

// Public entry point used by riot/*.api.ts files.
export async function riotGet<T>(platform: RiotPlatform, path: string): Promise<T> {
  return request<T>(platform, path);
}