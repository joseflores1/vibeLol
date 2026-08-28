import { describe, it, expect, vi } from 'vitest';
import { ZodError } from 'zod';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { ApiError } from '../src/utils/ApiError.js';

// Unit tests for the central errorHandler middleware's fallback paths.
// The route tests cover ZodError (400) indirectly; here we drive the
// middleware directly with a minimal res double.
function makeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function run(err: unknown) {
  const res = makeRes();
  errorHandler(err, {} as never, res as never, vi.fn());
  return res;
}

describe('errorHandler middleware', () => {
  it('maps unexpected errors to a 500 envelope (never leaks the stack shape)', () => {
    const res = run(new Error('boom'));
    expect(res.statusCode).toBe(500);
    const body = res.body as { success: boolean; message: string; error?: string };
    expect(body.success).toBe(false);
    expect(body.message).toBe('Internal server error');
  });

  it('passes ApiError status codes through', () => {
    const res = run(ApiError.notFound('Summoner gone'));
    expect(res.statusCode).toBe(404);
    expect((res.body as { message: string }).message).toBe('Summoner gone');
  });

  it('maps ZodError to a 400 with per-field issues', () => {
    const zodError = new ZodError([
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        path: ['gameName'],
        message: 'Too small',
      },
    ]);
    const res = run(zodError);
    expect(res.statusCode).toBe(400);
    const body = res.body as {
      success: boolean;
      message: string;
      errors: Array<{ path: string; message: string }>;
    };
    expect(body.success).toBe(false);
    expect(body.errors[0]).toMatchObject({ path: 'gameName', message: 'Too small' });
  });
});
