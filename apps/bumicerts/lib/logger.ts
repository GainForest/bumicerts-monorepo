/**
 * Debug logger that only outputs when DEBUG=true and NOT in production.
 * 
 * Uses Vercel system env variables:
 * - VERCEL_ENV: "production" | "preview" | "development" (set automatically by Vercel)
 * - DEBUG: manually set env variable to enable verbose logging
 * 
 * In local dev, VERCEL_ENV is undefined so we check NODE_ENV instead.
 */
const isProduction = process.env.VERCEL_ENV === "production" || 
  (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

const isDebug = process.env.DEBUG === "true" && !isProduction;

export const debug = {
  log: (...args: unknown[]) => { if (isDebug) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDebug) console.warn(...args); },
  error: (...args: unknown[]) => { if (isDebug) console.error(...args); },
};
