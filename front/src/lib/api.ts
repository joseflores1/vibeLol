// API client factory — typed fetch wrapper for the vibeLol backend.
// Per AGENTS.md §7: the frontend only calls our backend, never Riot directly.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

// Backend error shape — matches the central errorHandler middleware:
// { success: false, message: "...", errors?: [...] } on 4xx/5xx.
export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ path: string; message: string }>;
  status: number;
}

// All successful responses share: { success: true, data: T }.
interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Internal fetch wrapper: throws on non-2xx (with the parsed ApiError),
// returns data on 2xx. Network errors throw a synthetic 5xx-shaped error.
export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  let url = `${API_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw { success: false, message: "Network error — backend unreachable.", status: 0 } as ApiError;
  }

  const body = await res.json().catch(() => ({ success: false, message: "Invalid JSON response from server." })) as ApiResponse<T>;

  if (!res.ok || !body.success) {
    const err: ApiError = {
      success: false,
      message: (body as ApiError).message ?? `HTTP ${res.status}`,
      errors: (body as ApiError).errors,
      status: res.status,
    };
    throw err;
  }

  return (body as ApiSuccess<T>).data;
}