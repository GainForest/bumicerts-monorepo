/**
 * OTP (One-Time Password) Management
 * 
 * This module handles OTP generation, hashing, and verification for email verification.
 * Replaces the invite code system with a simpler OTP-based flow.
 * 
 * ## Why This Exists
 * - Better UX: Users receive a simple 6-digit code instead of a complex invite token
 * - Self-contained: No dependency on PDS admin API for code generation
 * - Time-limited: Codes expire after 10 minutes for security
 * 
 * ## Security
 * - OTPs are hashed with SHA-256 before storage (no plaintext codes in database)
 * - Constant-time comparison prevents timing attacks
 * - Expiry enforced at both generation and verification
 * 
 * ## Key Functions
 * - `generateOTP`: Creates a random 6-digit numeric code
 * - `hashOTP`: Hashes an OTP for secure storage
 * - `verifyOTP`: Constant-time comparison of OTP against hash
 */

import { createHash, timingSafeEqual } from "crypto";

/**
 * Generates a random 6-digit numeric OTP
 * @returns A 6-digit string (e.g., "123456")
 */
export function generateOTP(): string {
  // Generate a random number between 0 and 999999
  const otp = Math.floor(Math.random() * 1000000);
  // Pad with leading zeros to ensure 6 digits
  return otp.toString().padStart(6, "0");
}

/**
 * Hashes an OTP using SHA-256
 * @param otp - The plaintext OTP to hash
 * @returns The hex-encoded hash
 */
export function hashOTP(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

/**
 * Verifies an OTP against a stored hash using constant-time comparison
 * @param otp - The plaintext OTP to verify
 * @param hash - The stored hash to compare against
 * @returns true if the OTP matches the hash, false otherwise
 */
export function verifyOTP(otp: string, hash: string): boolean {
  const otpHash = hashOTP(otp);
  
  // Ensure both strings are the same length for timingSafeEqual
  if (otpHash.length !== hash.length) {
    return false;
  }
  
  try {
    const otpBuffer = Buffer.from(otpHash, "hex");
    const hashBuffer = Buffer.from(hash, "hex");
    return timingSafeEqual(otpBuffer, hashBuffer);
  } catch {
    // If Buffer conversion fails, fall back to regular comparison
    return otpHash === hash;
  }
}

/**
 * Calculates the expiry timestamp for an OTP (10 minutes from now)
 * @returns ISO timestamp string
 */
export function getOTPExpiry(): string {
  const expiryMs = Date.now() + 10 * 60 * 1000; // 10 minutes
  return new Date(expiryMs).toISOString();
}

/**
 * Checks if an OTP has expired
 * @param expiresAt - ISO timestamp string
 * @returns true if expired, false otherwise
 */
export function isOTPExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}
