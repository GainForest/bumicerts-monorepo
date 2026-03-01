/**
 * Hotjar/Contentsquare Analytics Integration
 * Wrapper functions for Hotjar tracking via Contentsquare script
 * Also sends events to Supabase for custom analytics dashboard
 */

import {
  BUMICERT_FLOW_EVENTS,
  BUMICERT_STEP_NAMES,
  NAVIGATION_EVENTS,
  AUTH_EVENTS,
  MARKETPLACE_EVENTS,
  ERROR_EVENTS,
  type PageViewedPayload,
  type WalletConnectedPayload,
  type BumicertFlowStartedPayload,
  type StepViewedPayload,
  type StepCompletedPayload,
  type BumicertPublishedPayload,
  type FlowAbandonedPayload,
  type ErrorPayload,
  type BumicertStepName,
} from "./events";

import * as supabaseTracking from "./supabase-tracking";

// Extend Window interface to include Hotjar
declare global {
  interface Window {
    hj?: (command: string, ...args: unknown[]) => void;
  }
}

// Check if Hotjar/Contentsquare is available
const isHotjarReady = (): boolean => {
  return typeof window !== "undefined" && typeof window.hj === "function";
};

/**
 * Wait for Hotjar to be ready (used internally)
 */
const waitForHotjar = (callback: () => void, maxAttempts = 50): void => {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (isHotjarReady()) {
      clearInterval(interval);
      callback();
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.warn("[Hotjar] Timed out waiting for Hotjar to load");
    }
  }, 100);
};

/**
 * Track a custom event
 */
export const trackEvent = (eventName: string): void => {
  const executeTracking = () => {
    if (!isHotjarReady()) return;

    try {
      window.hj?.("event", eventName);
    } catch (error) {
      console.error(`[Hotjar] Failed to track event "${eventName}":`, error);
    }
  };

  if (isHotjarReady()) {
    executeTracking();
  } else {
    waitForHotjar(executeTracking);
  }
};

/**
 * Identify a user with attributes
 */
export const identifyUser = (
  userId: string | null,
  attributes: Record<string, string | number | boolean>
): void => {
  const executeTracking = () => {
    if (!isHotjarReady()) return;

    try {
      window.hj?.("identify", userId, attributes);
    } catch (error) {
      console.error("[Hotjar] Failed to identify user:", error);
    }
  };

  if (isHotjarReady()) {
    executeTracking();
  } else {
    waitForHotjar(executeTracking);
  }
};

/**
 * Update state/tag for filtering recordings
 */
export const tagRecording = (tags: string[]): void => {
  const executeTracking = () => {
    if (!isHotjarReady()) return;

    try {
      window.hj?.("stateChange", tags.join("/"));
    } catch (error) {
      console.error("[Hotjar] Failed to tag recording:", error);
    }
  };

  if (isHotjarReady()) {
    executeTracking();
  } else {
    waitForHotjar(executeTracking);
  }
};

// ============================================
// Navigation Events
// ============================================

export const trackPageViewed = (payload: PageViewedPayload): void => {
  trackEvent(NAVIGATION_EVENTS.PAGE_VIEWED);
  // Use stateChange to update virtual page for SPA navigation
  const executeStateChange = () => {
    if (isHotjarReady()) {
      window.hj?.("stateChange", payload.path);
    }
  };

  if (isHotjarReady()) {
    executeStateChange();
  } else {
    waitForHotjar(executeStateChange);
  }
};

// ============================================
// Authentication Events
// ============================================

export const trackWalletConnected = (payload: WalletConnectedPayload): void => {
  trackEvent(AUTH_EVENTS.WALLET_CONNECTED);
  identifyUser(payload.address, {
    walletAddress: payload.address,
    chainId: payload.chainId ?? 0,
    connectedAt: new Date().toISOString(),
  });
};

export const trackWalletDisconnected = (): void => {
  trackEvent(AUTH_EVENTS.WALLET_DISCONNECTED);
};

// ============================================
// Marketplace Events
// ============================================

export const trackBumicertCardClicked = (bumicertId: string): void => {
  trackEvent(`${MARKETPLACE_EVENTS.BUMICERT_CARD_CLICKED}_${bumicertId}`);
  trackEvent(MARKETPLACE_EVENTS.BUMICERT_CARD_CLICKED);
};

export const trackBumicertDetailViewed = (bumicertId: string): void => {
  trackEvent(`${MARKETPLACE_EVENTS.BUMICERT_DETAIL_VIEWED}_${bumicertId}`);
  trackEvent(MARKETPLACE_EVENTS.BUMICERT_DETAIL_VIEWED);
};

// ============================================
// Bumicert Creation Flow Events
// ============================================

export const trackBumicertFlowStarted = (
  payload: BumicertFlowStartedPayload
): void => {
  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.FLOW_STARTED);
  tagRecording(["bumicert-creation", "flow-started"]);

  // Store flow start time in sessionStorage for duration calculation
  if (typeof window !== "undefined") {
    sessionStorage.setItem("bumicert_flow_start_time", Date.now().toString());
    if (payload.draftId) {
      sessionStorage.setItem("bumicert_flow_draft_id", payload.draftId);
    }
  }

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackFlowStarted(payload.draftId ?? "0");
};

export const trackStepViewed = (payload: StepViewedPayload): void => {
  const stepName = BUMICERT_STEP_NAMES[payload.stepIndex] ?? payload.stepName;

  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.STEP_VIEWED);
  trackEvent(`step_${payload.stepIndex + 1}_${stepName}_viewed`);
  tagRecording(["bumicert-creation", `step-${payload.stepIndex + 1}`]);

  // Store step start time for duration calculation
  if (typeof window !== "undefined") {
    sessionStorage.setItem("bumicert_step_start_time", Date.now().toString());
  }

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackStepViewed(
    payload.stepIndex,
    stepName,
    payload.draftId ?? "0"
  );
};

export const trackStepCompleted = (payload: StepCompletedPayload): void => {
  const stepName = BUMICERT_STEP_NAMES[payload.stepIndex] ?? payload.stepName;

  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.STEP_COMPLETED);
  trackEvent(`step_${payload.stepIndex + 1}_${stepName}_completed`);

  // Calculate time spent on step
  let timeSpentSeconds = 0;
  if (typeof window !== "undefined") {
    const stepStartTime = sessionStorage.getItem("bumicert_step_start_time");
    if (stepStartTime) {
      timeSpentSeconds = Math.round(
        (Date.now() - parseInt(stepStartTime, 10)) / 1000
      );
      identifyUser(null, {
        [`step_${payload.stepIndex + 1}_time_seconds`]: timeSpentSeconds,
      });
    }
  }

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackStepCompleted(
    payload.stepIndex,
    stepName,
    timeSpentSeconds
  );
};

export const trackBumicertPublished = (
  payload: BumicertPublishedPayload
): void => {
  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.BUMICERT_PUBLISHED);
  tagRecording(["bumicert-creation", "completed"]);

  // Calculate total duration if not provided
  let totalDuration = payload.totalDurationSeconds;
  if (typeof window !== "undefined" && !totalDuration) {
    const flowStartTime = sessionStorage.getItem("bumicert_flow_start_time");
    if (flowStartTime) {
      totalDuration = Math.round(
        (Date.now() - parseInt(flowStartTime, 10)) / 1000
      );
    }
  }

  identifyUser(null, {
    bumicertCreated: true,
    completionTimeSeconds: totalDuration ?? 0,
    lastCompletedAt: new Date().toISOString(),
  });

  // Clean up session storage
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("bumicert_flow_start_time");
    sessionStorage.removeItem("bumicert_step_start_time");
    sessionStorage.removeItem("bumicert_flow_draft_id");
  }

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackBumicertPublished(
    payload.draftId ?? "0",
    totalDuration ?? 0
  );
};

export const trackFlowAbandoned = (payload: FlowAbandonedPayload): void => {
  const stepName = BUMICERT_STEP_NAMES[payload.stepIndex] ?? payload.stepName;

  // Hotjar tracking
  trackEvent(BUMICERT_FLOW_EVENTS.FLOW_ABANDONED);
  trackEvent(`flow_abandoned_at_step_${payload.stepIndex + 1}_${stepName}`);
  tagRecording(["bumicert-creation", "abandoned"]);

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackFlowAbandoned(
    payload.stepIndex,
    payload.timeSpentSeconds ?? 0
  );
};

// ============================================
// Draft Events
// ============================================

export type DraftSavedPayload = {
  draftId: number;
  stepIndex: number;
  isUpdate: boolean;
};

export const trackDraftSaved = (payload: DraftSavedPayload): void => {
  // Hotjar tracking
  trackEvent("draft_saved");
  tagRecording(["bumicert-creation", "draft-saved"]);

  // Supabase tracking (async, non-blocking)
  supabaseTracking.trackDraftSaved(
    payload.draftId,
    payload.stepIndex,
    payload.isUpdate
  );
};

// ============================================
// Error Events
// ============================================

export const trackError = (payload: ErrorPayload): void => {
  trackEvent(ERROR_EVENTS.ERROR_ENCOUNTERED);
  identifyUser(null, {
    lastError: payload.message,
    lastErrorPath: payload.path ?? "",
  });
};

// ============================================
// Helper to get step name from index
// ============================================

export const getStepName = (stepIndex: number): BumicertStepName => {
  return BUMICERT_STEP_NAMES[stepIndex] ?? "cover_details";
};

// ============================================
// Get flow duration from session
// ============================================

export const getFlowDurationSeconds = (): number | null => {
  if (typeof window === "undefined") return null;

  const flowStartTime = sessionStorage.getItem("bumicert_flow_start_time");
  if (!flowStartTime) return null;

  return Math.round((Date.now() - parseInt(flowStartTime, 10)) / 1000);
};
