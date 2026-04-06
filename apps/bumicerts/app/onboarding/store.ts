import { create } from "zustand";
import { defaultSignupPdsDomain } from "@/lib/config/pds";

export type OnboardingStep =
  | "intro"
  | "email"
  | "org-details"
  | "credentials"
  | "complete";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "intro",
  "email",
  "org-details",
  "credentials",
  "complete",
];

export type Objective = "Conservation" | "Research" | "Education" | "Community" | "Other";

export type OnboardingData = {
  // Step 1: Intro
  organizationName: string;
  acceptedCodeOfConduct: boolean;

  // Step 2: Email
  email: string;
  inviteCode: string;

  // Step 3: Org Details
  country: string;
  startDate: string | null;
  longDescription: string;
  shortDescription: string;
  objectives: Objective[];
  website: string;
  logo: File | undefined;
  // Tracks the website URL that was last successfully brandfetched.
  // Persists across step navigation so re-mounting StepOrgDetails doesn't
  // re-fetch and overwrite data the user has already edited.
  lastBrandfetchedWebsite: string | null;

  // Step 4: Credentials
  handle: string;
  password: string;
  confirmPassword: string;
  /** The PDS domain selected during sign-up (one of signupPDSDomains). */
  selectedPdsDomain: string;

  // Step 5: Complete
  did: string;
  accountCreated: boolean;
  organizationInitialized: boolean;
};

export type OnboardingState = {
  currentStep: OnboardingStep;
  data: OnboardingData;
  isLoading: boolean;
  error: string | null;
};

export type OnboardingActions = {
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<OnboardingData>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialData: OnboardingData = {
  organizationName: "",
  acceptedCodeOfConduct: false,
  email: "",
  inviteCode: "",
  country: "",
  startDate: null,
  longDescription: "",
  shortDescription: "",
  objectives: [],
  website: "",
  logo: undefined,
  lastBrandfetchedWebsite: null,
  handle: "",
  password: "",
  confirmPassword: "",
  selectedPdsDomain: defaultSignupPdsDomain,
  did: "",
  accountCreated: false,
  organizationInitialized: false,
};

const initialState: OnboardingState = {
  currentStep: "intro",
  data: initialData,
  isLoading: false,
  error: null,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>(
  (set, get) => ({
    ...initialState,

    setStep: (step) => set({ currentStep: step }),

    nextStep: () => {
      const { currentStep } = get();
      const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
      if (currentIndex < ONBOARDING_STEPS.length - 1) {
        set({ currentStep: ONBOARDING_STEPS[currentIndex + 1], error: null });
      }
    },

    prevStep: () => {
      const { currentStep } = get();
      const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
      if (currentIndex > 0) {
        set({ currentStep: ONBOARDING_STEPS[currentIndex - 1], error: null });
      }
    },

    updateData: (data) =>
      set((state) => ({
        data: { ...state.data, ...data },
      })),

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    reset: () => set(initialState),
  })
);

// Helper function to generate a handle from org name and country
export function generateHandle(
  orgName: string,
  countryCode: string
): string {
  // Normalize the organization name - use only first 15 chars
  let handle = orgName
    .toLowerCase()
    .trim()
    .substring(0, 15) // Limit to first 15 characters
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  // Add country code if available
  if (countryCode) {
    handle = handle
      ? `${handle}-${countryCode.toLowerCase()}`
      : countryCode.toLowerCase();
  }

  if (!handle) {
    handle = "org";
  }

  return handle;
}

// Helper function to calculate password strength
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { strength: "weak", score: 0, feedback: ["Enter a password"] };
  }

  // Length checks
  if (password.length >= 8) score += 1;
  else feedback.push("At least 8 characters");

  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push("Add special characters");

  // Common patterns to avoid
  if (
    /^[a-zA-Z]+$/.test(password) ||
    /^[0-9]+$/.test(password) ||
    /(.)\1{2,}/.test(password)
  ) {
    score = Math.max(0, score - 1);
    feedback.push("Avoid common patterns");
  }

  let strength: PasswordStrength;
  if (score <= 2) strength = "weak";
  else if (score <= 3) strength = "fair";
  else if (score <= 5) strength = "good";
  else strength = "strong";

  return { strength, score, feedback };
}
