/**
 * Analytics Event Definitions
 * Centralized event names and types for tracking
 */

// Navigation Events
export const NAVIGATION_EVENTS = {
  PAGE_VIEWED: "page_viewed",
} as const;

// Authentication Events
export const AUTH_EVENTS = {
  WALLET_CONNECTED: "wallet_connected",
  WALLET_DISCONNECTED: "wallet_disconnected",
} as const;

// Marketplace Events
export const MARKETPLACE_EVENTS = {
  BUMICERT_CARD_CLICKED: "bumicert_card_clicked",
  BUMICERT_DETAIL_VIEWED: "bumicert_detail_viewed",
} as const;

// Bumicert Creation Flow Events
export const BUMICERT_FLOW_EVENTS = {
  FLOW_STARTED: "bumicert_flow_started",
  STEP_VIEWED: "bumicert_step_viewed",
  STEP_COMPLETED: "bumicert_step_completed",
  FLOW_ABANDONED: "bumicert_flow_abandoned",
  BUMICERT_PUBLISHED: "bumicert_published",
} as const;

// Error Events
export const ERROR_EVENTS = {
  ERROR_ENCOUNTERED: "error_encountered",
} as const;

// Step names for the Bumicert creation flow
export const BUMICERT_STEP_NAMES = [
  "cover_details",
  "impact_details",
  "site_details",
  "review",
  "submit",
] as const;

export type BumicertStepName = (typeof BUMICERT_STEP_NAMES)[number];

// Event payload types
export type PageViewedPayload = {
  path: string;
  title?: string;
  referrer?: string;
};

export type WalletConnectedPayload = {
  address: string;
  chainId?: number;
};

export type BumicertFlowStartedPayload = {
  draftId?: string;
};

export type StepViewedPayload = {
  stepIndex: number;
  stepName: BumicertStepName;
  draftId: string;
};

export type StepCompletedPayload = {
  stepIndex: number;
  stepName: BumicertStepName;
  draftId: string;
  timeSpentSeconds?: number;
};

export type BumicertPublishedPayload = {
  draftId: string;
  totalDurationSeconds: number;
};

export type FlowAbandonedPayload = {
  stepIndex: number;
  stepName: BumicertStepName;
  draftId: string;
  timeSpentSeconds?: number;
};

export type ErrorPayload = {
  message: string;
  stack?: string;
  componentStack?: string;
  path?: string;
};
