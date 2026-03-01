import { create } from "zustand";

type Step5StoreState = {
  overallStatus: "idle" | "pending" | "success" | "error";
};

type Step5StoreActions = {
  setOverallStatus: (status: "idle" | "pending" | "success" | "error") => void;
};

export const useStep5Store = create<Step5StoreState & Step5StoreActions>(
  (set) => ({
    overallStatus: "idle",
    setOverallStatus: (status) => set({ overallStatus: status }),
  })
);
