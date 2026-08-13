const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createRateLimiter(requestsPerInterval: number, intervalMs = 100_000) {
  const capacity = Math.max(1, Math.floor(requestsPerInterval));
  const refillPerMs = capacity / intervalMs;
  let tokens = capacity;
  let lastRefillAt = Date.now();
  let pending = Promise.resolve();

  async function takeToken() {
    for (;;) {
      const now = Date.now();
      tokens = Math.min(capacity, tokens + (now - lastRefillAt) * refillPerMs);
      lastRefillAt = now;

      if (tokens >= 1) {
        tokens -= 1;
        return;
      }

      await sleep(Math.ceil((1 - tokens) / refillPerMs));
    }
  }

  return {
    acquire() {
      const next = pending.then(takeToken);
      pending = next.catch(() => undefined);
      return next;
    },
  };
}
