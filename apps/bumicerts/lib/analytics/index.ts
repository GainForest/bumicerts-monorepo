/**
 * Analytics Module
 * Main entry point for all analytics tracking
 *
 * WARNING: Do NOT import from this barrel file in client components.
 * Importing from "@/lib/analytics" pulls in the entire analytics module
 * (including @supabase/supabase-js) into every page bundle.
 * Instead, import directly from the sub-modules:
 *   - "@/lib/analytics/hotjar"  — Hotjar/Contentsquare tracking functions
 *   - "@/lib/analytics/events"  — Event name constants and payload types
 *   - "@/lib/analytics/supabase-tracking" — Supabase DB tracking (uses dynamic import)
 */

// Re-export all event definitions
export * from "./events";

// Re-export all Hotjar/Contentsquare tracking functions
export {
  trackEvent,
  identifyUser,
  tagRecording,
  trackPageViewed,
  trackWalletConnected,
  trackWalletDisconnected,
  trackBumicertCardClicked,
  trackBumicertDetailViewed,
  trackBumicertFlowStarted,
  trackStepViewed,
  trackStepCompleted,
  trackBumicertPublished,
  trackFlowAbandoned,
  trackError,
  getStepName,
  getFlowDurationSeconds,
} from "./hotjar";
