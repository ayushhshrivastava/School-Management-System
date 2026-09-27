import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  JWT_SECRET: z.string().min(16).default('kids_world_school_super_secure_jwt_secret_key_change_in_production_2026'),
  JWT_EXPIRES_IN: z.string().default('15m'), // Short-lived access token as required
  JWT_REFRESH_SECRET: z.string().min(16).default('kids_world_school_refresh_token_secret_key_change_in_production_2026'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().default('kids_world_school_cookie_signing_secret_2026'),
  AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().default(5),
  AUTH_LOCKOUT_MINUTES: z.coerce.number().default(15),
  SUPER_ADMIN_NAME: z.string().default('System Administrator'),
  SUPER_ADMIN_USERNAME: z.string().default('superadmin'),
  SUPER_ADMIN_EMAIL: z.string().email().default('admin@kidsworldschool.com'),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default('Admin@KWS2026#Secure'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/kids_world_school_erp?schema=public'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_TO_FILE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  LOG_DIR: z.string().default('logs'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
