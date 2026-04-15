/**
 * Server-side environment variables.
 * Import from this file ONLY in server components, API routes, and server actions.
 * Never import this in "use client" files or any module they depend on.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    // Node / Runtime
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Vercel system (server-side, auto-injected)
    VERCEL_ENV: z
      .enum(["development", "preview", "production"])
      .optional(),
    // Raw deployment alias — e.g. bumicerts-r3f59v16y-gainforest.vercel.app
    // Never the custom domain. Use getPublicUrl() from lib/url.ts instead of
    // reading this directly.
    VERCEL_URL: z.string().optional(),
    // Always the shortest production custom domain — e.g. alpha.fund.gainforest.app.
    // Set even on preview deployments. Use getPublicUrl() instead of reading this directly.
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    // The git branch being deployed (e.g. "development", "main", "feature/xyz")
    VERCEL_GIT_COMMIT_REF: z.string().optional(),

    // Branch-to-URL mappings for preview deployments
    // These control which URL to use based on the branch being deployed
    PRODUCTION_BRANCH_NAME: z.string().optional(),
    STAGING_BRANCH_NAME: z.string().optional(),
    PRODUCTION_URL: z.string().url().optional(),
    STAGING_URL: z.string().url().optional(),

    // ATProto OAuth
    ATPROTO_JWK_PRIVATE: z.string().min(1),
    COOKIE_SECRET: z.string().min(32),

    // PDS admin credentials
    PDS_ADMIN_IDENTIFIER: z.string().min(1),
    PDS_ADMIN_PASSWORD: z.string().min(1),
    INVITE_CODES_PASSWORD: z.string().min(1),

    // Supabase (service role — server only)
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_KEY: z.string().min(1),

    // AWS S3
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_S3_BUCKET: z.string().min(1),

    // Email
    RESEND_API_KEY: z.string().startsWith("re_"),

    // External AI / Brand APIs (optional)
    GEMINI_API_KEY: z.string().min(1).optional(),
    BRANDFETCH_API_KEY: z.string().min(1).optional(),

    // Database
    POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING: z.string().url(),

    // Rate-limiting
    RATE_LIMIT_HMAC_KEY: z.string().min(32),
    RATE_LIMIT_FAIL_OPEN: z.string().optional(),

    // Debug
    DEBUG: z.string().optional(),

    // Facilitator — pays gas for USDC donations, writes funding receipts
    // NOTE: FACILITATOR_DID is public — use NEXT_PUBLIC_FACILITATOR_DID in client.ts
    FACILITATOR_HANDLE: z.string().min(1).optional(),
    FACILITATOR_PASSWORD: z.string().min(1).optional(),
    FACILITATOR_PRIVATE_KEY: z.string().min(1).optional(),

    // Base network RPC
    BASE_RPC_URL: z.string().url().default("https://mainnet.base.org"),
  },

  client: {},

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    PRODUCTION_BRANCH_NAME: process.env.PRODUCTION_BRANCH_NAME,
    STAGING_BRANCH_NAME: process.env.STAGING_BRANCH_NAME,
    PRODUCTION_URL: process.env.PRODUCTION_URL,
    STAGING_URL: process.env.STAGING_URL,
    ATPROTO_JWK_PRIVATE: process.env.ATPROTO_JWK_PRIVATE,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    PDS_ADMIN_IDENTIFIER: process.env.PDS_ADMIN_IDENTIFIER,
    PDS_ADMIN_PASSWORD: process.env.PDS_ADMIN_PASSWORD,
    INVITE_CODES_PASSWORD: process.env.INVITE_CODES_PASSWORD,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    BRANDFETCH_API_KEY: process.env.BRANDFETCH_API_KEY,
    POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING:
      process.env.POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING,
    RATE_LIMIT_HMAC_KEY: process.env.RATE_LIMIT_HMAC_KEY,
    RATE_LIMIT_FAIL_OPEN: process.env.RATE_LIMIT_FAIL_OPEN,
    DEBUG: process.env.DEBUG,
    FACILITATOR_HANDLE: process.env.FACILITATOR_HANDLE,
    FACILITATOR_PASSWORD: process.env.FACILITATOR_PASSWORD,
    FACILITATOR_PRIVATE_KEY: process.env.FACILITATOR_PRIVATE_KEY,
    BASE_RPC_URL: process.env.BASE_RPC_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
