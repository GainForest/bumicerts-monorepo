import { create } from "zustand";

export type NewBumicertFormState = {
  currentStepIndex: number;

  // Form index that is the last step index reached by the user
  maxStepIndexReached: number;
};

export type NewBumicertFormActions = {
  setCurrentStepIndex: (step: number) => void;
};

const useNewBumicertStore = create<
  NewBumicertFormState & NewBumicertFormActions
>((set) => ({
  currentStepIndex: 0,
  maxStepIndexReached: 0,
  setCurrentStepIndex: (step) =>
    set((state) => ({
      currentStepIndex: step,
      maxStepIndexReached: Math.max(state.maxStepIndexReached, step),
    })),
}));

export default useNewBumicertStore;
