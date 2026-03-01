const SESSION_ID_KEY = "bumicert_analytics_session";
const LAST_ACTIVITY_KEY = "bumicert_analytics_last_activity";
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================
// Session Management
// ============================================

/**
 * Checks if the current session has expired (>24h since last activity).
 */
const isSessionExpired = (): boolean => {
  if (typeof window === "undefined") return true;

  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return true;

  const elapsed = Date.now() - parseInt(lastActivity, 10);
  return elapsed > SESSION_EXPIRY_MS;
};

/**
 * Gets the current session ID or creates a new one if needed.
 * Session expires after 24 hours of inactivity.
 */
export const getOrCreateSessionId = (): string => {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  const existingSessionId = localStorage.getItem(SESSION_ID_KEY);

  if (existingSessionId && !isSessionExpired()) {
    return existingSessionId;
  }

  // Create new session
  const newSessionId = crypto.randomUUID();
  localStorage.setItem(SESSION_ID_KEY, newSessionId);
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

  // Create session record in database (fire and forget)
  upsertSession(newSessionId).catch(console.error);

  return newSessionId;
};

/**
 * Updates the last activity timestamp.
 */
const updateLastActivity = (): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

// ============================================
// Database Operations
// ============================================

/**
 * Creates or updates a session record.
 */
export const upsertSession = async (sessionId: string): Promise<void> => {
  const { supabase } = await import("@/lib/supabase/client");
  const { error } = await supabase.from("analytics_sessions").upsert(
    {
      session_id: sessionId,
      started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      completed: false,
    },
    { onConflict: "session_id" }
  );

  if (error) {
    console.error("[Analytics] Failed to upsert session:", error);
  }
};

/**
 * Updates the session's last activity timestamp.
 */
const updateSessionActivity = async (sessionId: string): Promise<void> => {
  const { supabase } = await import("@/lib/supabase/client");
  const { error } = await supabase
    .from("analytics_sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("session_id", sessionId);

  if (error) {
    console.error("[Analytics] Failed to update session activity:", error);
  }
};

/**
 * Marks a session as completed with duration.
 */
export const markSessionCompleted = async (
  sessionId: string,
  durationSeconds: number
): Promise<void> => {
  const { supabase } = await import("@/lib/supabase/client");
  const { error } = await supabase
    .from("analytics_sessions")
    .update({
      completed: true,
      completion_duration_seconds: durationSeconds,
      last_activity_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (error) {
    console.error("[Analytics] Failed to mark session completed:", error);
  }
};

// ============================================
// Event Tracking
// ============================================

type EventData = Record<string, unknown>;

/**
 * Inserts an analytics event into the database.
 * Also updates the session's last activity timestamp.
 * This function is async but designed to be non-blocking.
 */
export const insertEvent = async (
  eventType: string,
  eventData: EventData = {}
): Promise<void> => {
  const sessionId = getOrCreateSessionId();
  updateLastActivity();

  const { supabase } = await import("@/lib/supabase/client");

  // Insert event and update session activity in parallel
  const [eventResult] = await Promise.all([
    supabase.from("analytics_events").insert({
      session_id: sessionId,
      event_type: eventType,
      event_data: eventData,
    }),
    updateSessionActivity(sessionId),
  ]);

  if (eventResult.error) {
    console.error("[Analytics] Failed to insert event:", eventResult.error);
  }
};

// ============================================
// High-Level Tracking Functions
// ============================================

/**
 * Track when user starts the Bumicert creation flow.
 */
export const trackFlowStarted = (draftId: string): void => {
  insertEvent("flow_started", { draftId }).catch(console.error);
};

/**
 * Track when user views a step.
 */
export const trackStepViewed = (
  stepIndex: number,
  stepName: string,
  draftId: string
): void => {
  insertEvent("step_viewed", { stepIndex, stepName, draftId }).catch(
    console.error
  );
};

/**
 * Track when user completes a step.
 */
export const trackStepCompleted = (
  stepIndex: number,
  stepName: string,
  timeSpentSeconds: number
): void => {
  insertEvent("step_completed", { stepIndex, stepName, timeSpentSeconds }).catch(
    console.error
  );
};

/**
 * Track when a Bumicert is successfully published.
 */
export const trackBumicertPublished = (
  draftId: string,
  totalDurationSeconds: number
): void => {
  const sessionId = getOrCreateSessionId();

  // Insert event and mark session complete
  Promise.all([
    insertEvent("bumicert_published", { draftId, totalDurationSeconds }),
    markSessionCompleted(sessionId, totalDurationSeconds),
  ]).catch(console.error);
};

/**
 * Track when user abandons the flow.
 */
export const trackFlowAbandoned = (
  lastStep: number,
  timeSpentSeconds: number
): void => {
  insertEvent("flow_abandoned", { lastStep, timeSpentSeconds }).catch(
    console.error
  );
};

/**
 * Track when user saves a draft.
 */
export const trackDraftSaved = (
  draftId: number,
  stepIndex: number,
  isUpdate: boolean
): void => {
  insertEvent("draft_saved", { draftId, stepIndex, isUpdate }).catch(
    console.error
  );
};
