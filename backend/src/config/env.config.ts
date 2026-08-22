import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  ALLOWED_ORIGINS: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SWAGGER_ENABLED: z.string().optional().default('true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>) => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Config validation error: ${parsed.error.message}`);
  }
  return parsed.data;
};
