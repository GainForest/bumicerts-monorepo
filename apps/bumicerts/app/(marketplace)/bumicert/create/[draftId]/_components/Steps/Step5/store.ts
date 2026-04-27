import { create } from "zustand";

export interface CreateBumicertResponse {
  uri: string;
  cid: string;
}

export interface PublishedBumicertPreview {
  coverImage: File;
  title: string;
  description?: string;
  objectives: string[];
  organizationName: string;
  logoUrl: string | null;
}

type Step5StoreState = {
  overallStatus: "idle" | "pending" | "success" | "error";
  createdBumicertResponse: CreateBumicertResponse | null;
  publishedPreview: PublishedBumicertPreview | null;
};

type Step5StoreActions = {
  setOverallStatus: (status: "idle" | "pending" | "success" | "error") => void;
  setCreatedBumicertResponse: (response: CreateBumicertResponse | null) => void;
  setPublishedPreview: (preview: PublishedBumicertPreview | null) => void;
  resetSuccessState: () => void;
  resetAll: () => void;
};

export const useStep5Store = create<Step5StoreState & Step5StoreActions>(
  (set) => ({
    overallStatus: "idle",
    createdBumicertResponse: null,
    publishedPreview: null,
    setOverallStatus: (status) => set({ overallStatus: status }),
    setCreatedBumicertResponse: (response) =>
      set({ createdBumicertResponse: response }),
    setPublishedPreview: (preview) => set({ publishedPreview: preview }),
    resetSuccessState: () =>
      set({
        createdBumicertResponse: null,
        publishedPreview: null,
      }),
    resetAll: () =>
      set({
        overallStatus: "idle",
        createdBumicertResponse: null,
        publishedPreview: null,
      }),
  })
);
