import { z } from 'zod';

/**
 * Centralized, validated access to Vite environment variables.
 * No component or feature module should read `import.meta.env` directly;
 * everything funnels through this module so there is exactly one place
 * that knows about environment wiring (Int / Val / Prod).
 */
const envSchema = z.object({
  VITE_APP_ENV: z.enum(['int', 'val', 'prod']).default('int'),
  VITE_API_BASE_URL: z.string().min(1),
  VITE_STREAM_URL: z.string().min(1),
  VITE_MOCKS_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  VITE_RECONNECT_BASE_DELAY_MS: z
    .string()
    .default('500')
    .transform((v) => Number(v)),
  VITE_RECONNECT_MAX_DELAY_MS: z
    .string()
    .default('10000')
    .transform((v) => Number(v)),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // Fail fast and loudly in every environment: a misconfigured .env file
  // should never silently fall back to a hardcoded URL.
  console.error('Invalid environment configuration', parsed.error.flatten());
  throw new Error('Invalid environment configuration. Check your .env file.');
}

export const env = parsed.data;

export type AppEnv = typeof env;
