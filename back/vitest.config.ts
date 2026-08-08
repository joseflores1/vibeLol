import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Provide dummy env values before any module imports env.ts, so tests
    // run without real secrets or a live database. Tests that need Prisma
    // mock the client; tests that hit Riot mock fetch.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test?schema=public',
      RIOT_API_KEY: 'test-riot-key',
      PORT: '3001',
      NODE_ENV: 'test',
    },
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});