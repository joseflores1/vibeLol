import dotenv from 'dotenv';

dotenv.config();

// Reads a required env var and fails fast at startup if it is missing,
// instead of letting an "undefined" value leak deeper into the app.
function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Single source of truth for environment configuration.
export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  riotApiKey: requireEnv('RIOT_API_KEY'),
  riotRateLimitPer100s: Math.max(1, Number(process.env.RIOT_RATE_LIMIT_PER_100S ?? 20)),
  riotMaxRetries: Math.max(0, Number(process.env.RIOT_MAX_RETRIES ?? 3)),
} as const;

export const isProduction = env.nodeEnv === 'production';
