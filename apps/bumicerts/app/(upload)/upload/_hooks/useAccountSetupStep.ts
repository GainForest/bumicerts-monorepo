"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

const stepParser = parseAsStringLiteral(["1"]);

export function useAccountSetupStep(): [0 | 1, (step: 0 | 1) => void] {
  const [step, setStep] = useQueryState(
    "step",
    stepParser.withOptions({ shallow: true, history: "push" }),
  );

  const setAccountSetupStep = (value: 0 | 1) => {
    void setStep(value === 0 ? null : "1");
  };

  return [step === "1" ? 1 : 0, setAccountSetupStep];
}
