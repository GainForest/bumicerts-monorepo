import z from "zod";
import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { LeafletLinearDocumentSchema } from "@gainforest/leaflet-react/schemas";
import type { app } from "@gainforest/generated";
import { extractTextFromLinearDocument } from "@/lib/adapters";

// Constants for localStorage persistence
// v2: description changed from string+facets (bsky-richtext) to LeafletLinearDocument
const STORAGE_KEY = "bumicert-draft-form-v2";
const STORAGE_EXPIRY_DAYS = 30;

export const step1Schema = z.object({
  projectName: z
    .string()
    .min(1, "Required")
    .max(50, "No more than 50 characters allowed")
    .describe("Bumicert Name"),
  coverImage: z
    .instanceof(File)
    .refine((v) => v.size > 0, {
      message: "Required",
    })
    .describe("Cover Image"),
  workType: z.array(z.string()).min(1, "Required").describe("Work Type"),
  /**
   * [startDate, endDate | null]
   * endDate is null when isOngoing is true.
   */
  projectDateRange: z
    .tuple([z.date(), z.date().nullable()])
    .describe("Bumicert Date Range"),
  /**
   * Whether the work is still ongoing. When true, endDate is null.
   */
  isOngoing: z.boolean().describe("Ongoing"),
});
export type Step1FormValues = z.infer<typeof step1Schema>;
const thisYear = new Date().getFullYear();
export const step1InitialValues: Step1FormValues = {
  projectName: "",
  coverImage: new File([], "cover-image.png"),
  workType: [],
  projectDateRange: [new Date(`${thisYear}-01-01`), new Date()],
  isOngoing: false,
};

// Typed schema for a single Bluesky richtext facet.
// Used for shortDescriptionFacets — users can't edit these yet (textarea only),
// but the structure is ready for when we add rich-text editing for shortDescription.
const bskyFacetSchema = z.custom<app.bsky.richtext.facet.Main>(
  (val): val is app.bsky.richtext.facet.Main => {
    if (!val || typeof val !== "object") return false;
    const obj = val as Record<string, unknown>;
    return (
      typeof obj["index"] === "object" &&
      obj["index"] !== null &&
      Array.isArray(obj["features"])
    );
  }
);

export const step2Schema = z.object({
  /**
   * Full rich-text description as a Leaflet LinearDocument.
   * Required — must have at least one non-empty block. No length cap.
   */
  description: LeafletLinearDocumentSchema.refine(
    (doc) => extractTextFromLinearDocument(doc).trim().length > 0,
    { message: "Description is required" }
  ).describe("Your Impact Story"),
  /**
   * Short plain-text summary (max 3000 chars, 300 graphemes).
   * Rich text facets are stored separately in shortDescriptionFacets.
   */
  shortDescription: z
    .string()
    .min(1, "Required")
    .max(3000, "No more than 3000 characters allowed")
    .describe("Short Description"),
  /**
   * Bluesky richtext facets for shortDescription (mentions, URLs, hashtags).
   * Currently not editable via the UI — field is reserved for future use.
   */
  shortDescriptionFacets: z.array(bskyFacetSchema).optional(),
});
export type Step2FormValues = z.infer<typeof step2Schema>;
export const step2InitialValues: Step2FormValues = {
  description: { blocks: [] },
  shortDescription: "",
  shortDescriptionFacets: [],
};

const contributorSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "All contributors must have a name"),
});

export type Contributor = z.infer<typeof contributorSchema>;

export const step3Schema = z.object({
  contributors: z
    .array(contributorSchema)
    .min(1, "Required")
    .describe("List of Contributors"),
  siteBoundaries: z
    .array(
      z.object({
        cid: z.string(),
        uri: z.string(),
      })
    )
    .min(1, "Required")
    .describe("Site Boundaries"),
  confirmPermissions: z
    .boolean()
    .refine((v) => v === true, {
      message: "Required",
    })
    .describe("Permissions"),
  agreeTnc: z
    .boolean()
    .refine((v) => v === true, {
      message: "Required",
    })
    .describe("Terms and Conditions"),
});
export type Step3FormValues = z.infer<typeof step3Schema>;
export const step3InitialValues: Step3FormValues = {
  contributors: [],
  siteBoundaries: [],
  confirmPermissions: false,
  agreeTnc: false,
};

const schemas = [step1Schema, step2Schema, step3Schema];

// Serializable version of form values (without File, with string dates)
type SerializableStep1FormValues = Omit<Step1FormValues, "coverImage" | "projectDateRange"> & {
  // endDate is null when isOngoing is true
  projectDateRange: [string, string | null];
};

type SerializableFormValues = [
  SerializableStep1FormValues,
  Step2FormValues,
  Step3FormValues
];

// Helper to serialize form values for localStorage
const serializeFormValues = (
  formValues: [Step1FormValues, Step2FormValues, Step3FormValues]
): SerializableFormValues => {
  const [step1, step2, step3] = formValues;
  return [
    {
      projectName: step1.projectName,
      workType: step1.workType,
      isOngoing: step1.isOngoing,
      projectDateRange: [
        step1.projectDateRange[0].toISOString(),
        step1.projectDateRange[1]?.toISOString() ?? null,
      ],
    },
    step2,
    step3,
  ];
};

// Helper to deserialize form values from localStorage
const deserializeFormValues = (
  serialized: SerializableFormValues
): [Step1FormValues, Step2FormValues, Step3FormValues] => {
  const [step1, step2, step3] = serialized;
  const endDateStr = step1.projectDateRange[1];
  const endDate: Date | null = endDateStr ? new Date(endDateStr) : null;
  return [
    {
      projectName: step1.projectName,
      coverImage: new File([], "cover-image.png"), // Empty file - user needs to re-upload
      workType: step1.workType,
      isOngoing: step1.isOngoing ?? endDate === null,
      projectDateRange: [
        new Date(step1.projectDateRange[0]),
        endDate,
      ],
    },
    step2,
    step3,
  ];
};

// Custom storage with expiry check and hydration guard
const createStorageWithExpiry = (): StateStorage => ({
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    const item = localStorage.getItem(name);
    if (!item) return null;

    try {
      const parsed = JSON.parse(item);
      const savedAt = parsed?.state?.savedAt;
      if (savedAt) {
        const expiryTime = STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() - savedAt > expiryTime) {
          // Data has expired, remove it
          localStorage.removeItem(name);
          return null;
        }
      }
      return item;
    } catch {
      return item;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    
    // IMPORTANT: Don't overwrite localStorage until the store is hydrated.
    // This prevents the initial empty state from overwriting saved data.
    // However, if the form contains meaningful user data, allow the save
    // even if the hydration flag wasn't set (edge-case recovery).
    try {
      const parsed = JSON.parse(value);
      const isHydrated = parsed?.state?.isHydrated;
      if (isHydrated) {
        localStorage.setItem(name, value);
        return;
      }
      
      // Not hydrated — only allow save if form has meaningful data
      const formValues = parsed?.state?.formValues;
      const hasProjectName =
        typeof formValues?.[0]?.projectName === "string" &&
        formValues[0].projectName.length > 0;
      const hasDescription =
        typeof formValues?.[1]?.shortDescription === "string" &&
        formValues[1].shortDescription.length > 0;
      if (!hasProjectName && !hasDescription) {
        // Block empty-state saves before hydration
        return;
      }
      
      // Has meaningful data, allow the save
      localStorage.setItem(name, value);
    } catch {
      // If we can't parse, don't save
      return;
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(name);
  },
});

// Function to clear persisted state (call after successful submit)
export const clearPersistedFormState = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
};

// Function to get persisted form values (for StoreHydrator fallback)
export const getPersistedFormValues = (): [Step1FormValues, Step2FormValues, Step3FormValues] | null => {
  if (typeof window === "undefined") return null;
  
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    const savedAt = parsed?.state?.savedAt;
    
    // Check expiry
    if (savedAt) {
      const expiryTime = STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - savedAt > expiryTime) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }
    
    const serializedFormValues = parsed?.state?.formValues;
    if (!serializedFormValues) return null;
    
    return deserializeFormValues(serializedFormValues);
  } catch {
    return null;
  }
};

type FormStoreState = {
  isHydrated: boolean;
  formValues: [Step1FormValues, Step2FormValues, Step3FormValues];
  formErrors: [
    Partial<Record<keyof Step1FormValues, string>>,
    Partial<Record<keyof Step2FormValues, string>>,
    Partial<Record<keyof Step3FormValues, string>>
  ];
  formCompletionPercentages: [number, number, number];
  draftCoverImageHash?: string;
  // For localStorage persistence - tracks when form was last saved
  savedAt?: number;
  // Tracks if there are unsaved changes (for beforeunload warning)
  isDirty: boolean;
};

type FormStoreActions = {
  hydrate: (
    formValues: [Step1FormValues, Step2FormValues, Step3FormValues] | null,
    draftCoverImageHash?: string
  ) => void;
  setFormValue: [
    (
      key: keyof Step1FormValues,
      value: Step1FormValues[keyof Step1FormValues]
    ) => void,
    (
      key: keyof Step2FormValues,
      value: Step2FormValues[keyof Step2FormValues]
    ) => void,
    (
      key: keyof Step3FormValues,
      value: Step3FormValues[keyof Step3FormValues]
    ) => void
  ];
  updateErrorsAndCompletion: (formIndex?: number) => void;
  reset: (isHydrated?: boolean) => void;
  setDraftCoverImageHash: (hash: string) => void;
  // Mark form as saved (clears dirty state)
  markAsSaved: () => void;
};

const initialState: FormStoreState = {
  isHydrated: false,
  formValues: [step1InitialValues, step2InitialValues, step3InitialValues],
  formErrors: [{}, {}, {}],
  formCompletionPercentages: [0, 0, 0],
  isDirty: false,
};

export const useFormStore = create<FormStoreState & FormStoreActions>()(
  persist(
    (set, get) => {
      const setForm1Value: FormStoreActions["setFormValue"][0] = (key, value) => {
        set((state) => ({
          formValues: [
            { ...state.formValues[0], [key]: value },
            state.formValues[1],
            state.formValues[2],
          ],
          savedAt: Date.now(),
          isDirty: true,
        }));
        get().updateErrorsAndCompletion();
      };
      const setForm2Value: FormStoreActions["setFormValue"][1] = (key, value) => {
        set((state) => ({
          formValues: [
            state.formValues[0],
            { ...state.formValues[1], [key]: value },
            state.formValues[2],
          ],
          savedAt: Date.now(),
          isDirty: true,
        }));
        get().updateErrorsAndCompletion();
      };
      const setForm3Value: FormStoreActions["setFormValue"][2] = (key, value) => {
        set((state) => ({
          formValues: [
            state.formValues[0],
            state.formValues[1],
            { ...state.formValues[2], [key]: value },
          ],
          savedAt: Date.now(),
          isDirty: true,
        }));
        get().updateErrorsAndCompletion();
      };

      const getFormErrorsAndCompletion = (formIndex: number) => {
        const schema = schemas[formIndex];
        const formValues = get().formValues[formIndex];
        try {
          schema.parse(formValues);
          const result = {
            errors: {},
            completionPercentage: 100,
          };
          return result;
        } catch (error) {
          if (error instanceof z.ZodError) {
            const fieldErrors: Partial<Record<keyof Step1FormValues, string>> =
              {};
            error.issues.forEach((err: z.ZodIssue) => {
              if (err.path[0]) {
                fieldErrors[err.path[0] as keyof Step1FormValues] = err.message;
              }
            });
            const totalFields = Object.keys(formValues).length;
            const errorCount = Object.keys(fieldErrors).length;
            const percentage = Math.round(
              ((totalFields - errorCount) / totalFields) * 100
            );
            const result = {
              errors: fieldErrors,
              isValid: false,
              completionPercentage: percentage,
            };
            return result;
          }
        }
      };

      return {
        ...initialState,
        hydrate: (formValues, draftCoverImageHash) => {
          if (!formValues) {
            // If no formValues provided (new draft), check localStorage backup
            const localStorageBackup = getPersistedFormValues();
            if (localStorageBackup) {
              // Use localStorage backup
              set({
                ...initialState,
                isHydrated: true,
                formValues: localStorageBackup,
              });
            } else {
              // No backup, use initial state
              set({ ...initialState, isHydrated: true });
            }
            get().updateErrorsAndCompletion();
            return;
          }
          // Database data takes priority
          set({
            ...initialState,
            isHydrated: true,
            formValues,
            draftCoverImageHash,
            savedAt: Date.now(),
          });
          get().updateErrorsAndCompletion();
        },
        setDraftCoverImageHash: (hash) => {
          set({ draftCoverImageHash: hash });
        },
        setFormValue: [setForm1Value, setForm2Value, setForm3Value],
        updateErrorsAndCompletion: (formIndex) => {
          if (formIndex !== undefined) {
            const errorsAndCompletion = getFormErrorsAndCompletion(formIndex);
            if (!errorsAndCompletion) return;
            set((state) => {
              const newFormErrors: FormStoreState["formErrors"] = [
                formIndex === 0
                  ? errorsAndCompletion.errors
                  : state.formErrors[0],
                formIndex === 1
                  ? errorsAndCompletion.errors
                  : state.formErrors[1],
                formIndex === 2
                  ? errorsAndCompletion.errors
                  : state.formErrors[2],
              ];
              const newFormCompletionPercentages: FormStoreState["formCompletionPercentages"] =
                [
                  formIndex === 0
                    ? errorsAndCompletion.completionPercentage
                    : state.formCompletionPercentages[0],
                  formIndex === 1
                    ? errorsAndCompletion.completionPercentage
                    : state.formCompletionPercentages[1],
                  formIndex === 2
                    ? errorsAndCompletion.completionPercentage
                    : state.formCompletionPercentages[2],
                ];
              return {
                formErrors: newFormErrors,
                formCompletionPercentages: newFormCompletionPercentages,
              };
            });
          } else {
            const step1ErrorsAndCompletion = getFormErrorsAndCompletion(0);
            const step2ErrorsAndCompletion = getFormErrorsAndCompletion(1);
            const step3ErrorsAndCompletion = getFormErrorsAndCompletion(2);

            const step1Errors = step1ErrorsAndCompletion
              ? step1ErrorsAndCompletion.errors
              : get().formErrors[0];
            const step2Errors = step2ErrorsAndCompletion
              ? step2ErrorsAndCompletion.errors
              : get().formErrors[1];
            const step3Errors = step3ErrorsAndCompletion
              ? step3ErrorsAndCompletion.errors
              : get().formErrors[2];

            const step1CompletionPercentage = step1ErrorsAndCompletion
              ? step1ErrorsAndCompletion.completionPercentage
              : get().formCompletionPercentages[0];
            const step2CompletionPercentage = step2ErrorsAndCompletion
              ? step2ErrorsAndCompletion.completionPercentage
              : get().formCompletionPercentages[1];
            const step3CompletionPercentage = step3ErrorsAndCompletion
              ? step3ErrorsAndCompletion.completionPercentage
              : get().formCompletionPercentages[2];

            set({
              formErrors: [step1Errors, step2Errors, step3Errors],
              formCompletionPercentages: [
                step1CompletionPercentage,
                step2CompletionPercentage,
                step3CompletionPercentage,
              ],
            });
          }
        },
        reset: (isHydrated) => {
          set({
            ...initialState,
            isHydrated: isHydrated === undefined ? get().isHydrated : isHydrated,
          });
          // Also clear localStorage when resetting
          clearPersistedFormState();
        },
        markAsSaved: () => {
          set({ isDirty: false });
        },
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => createStorageWithExpiry()),
      // Only persist serializable form data (include isHydrated for storage guard)
      partialize: (state) => ({
        formValues: serializeFormValues(state.formValues),
        savedAt: state.savedAt,
        isHydrated: state.isHydrated,
      }),
      // Skip automatic rehydration - we handle this manually in StoreHydrator
      skipHydration: true,
    }
  )
);
