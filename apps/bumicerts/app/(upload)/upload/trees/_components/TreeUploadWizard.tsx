"use client";

import { useState } from "react";
import FileDropStep from "./FileDropStep";
import ColumnMappingStep from "./ColumnMappingStep";
import PreviewStep from "./PreviewStep";
import UploadStep, { readPendingUpload } from "./UploadStep";
import type { ColumnMapping, ValidatedRow } from "@/lib/upload/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type WizardState = {
  currentStep: 1 | 2 | 3 | 4;
  file: File | null;
  parsedData: Record<string, string>[] | null;
  headers: string[] | null;
  mappings: ColumnMapping[];
  validRows: ValidatedRow[];
  establishmentMeans: string | null;
  datasetName: string;
  datasetDescription: string;
};

const INITIAL_STATE: WizardState = {
  currentStep: 1,
  file: null,
  parsedData: null,
  headers: null,
  mappings: [],
  validRows: [],
  establishmentMeans: null,
  datasetName: "",
  datasetDescription: "",
};

/**
 * Lazy initializer for wizard state.
 * On first render, checks sessionStorage for pending upload data
 * (e.g. after an OAuth redirect) and restores to step 4 if found.
 * This runs synchronously during the initial render, not inside an effect,
 * so it avoids the cascading-render lint rule.
 */
function initWizardState(): WizardState {
  // sessionStorage is only available in the browser
  if (typeof window === "undefined") return INITIAL_STATE;
  const pending = readPendingUpload();
  if (pending) {
    return { ...INITIAL_STATE, validRows: pending.validRows, currentStep: 4 };
  }
  return INITIAL_STATE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step progress indicator
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: "Upload File" },
  { number: 2, label: "Map Columns" },
  { number: 3, label: "Preview" },
  { number: 4, label: "Upload" },
] as const;

function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const isLast = idx === STEPS.length - 1;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isActive
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  isActive
                    ? "text-foreground font-medium"
                    : isCompleted
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line (not after last step) */}
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-colors ${
                  isCompleted ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main wizard component
// ─────────────────────────────────────────────────────────────────────────────

export function TreeUploadWizard() {
  // Lazy initializer: checks sessionStorage on first render for pending upload
  // data (e.g. after an OAuth redirect) and restores to step 4 if found.
  const [state, setState] = useState<WizardState>(initWizardState);

  // ── Step 1 → 2: file parsed and initial mappings detected ─────────────────
  const handleFileAndMappings = (
    file: File,
    parsedData: Record<string, string>[],
    headers: string[],
    mappings: ColumnMapping[],
    establishmentMeans: string | null,
    datasetName: string,
    datasetDescription: string,
  ) => {
    setState((prev) => ({
      ...prev,
      file,
      parsedData,
      headers,
      mappings,
      establishmentMeans,
      datasetName,
      datasetDescription,
      currentStep: 2,
    }));
  };

  // ── Step 2: mappings updated by user ──────────────────────────────────────
  const handleMappingsChange = (mappings: ColumnMapping[]) => {
    setState((prev) => ({ ...prev, mappings }));
  };

  // ── Step 2 → 3 ────────────────────────────────────────────────────────────
  const handleGoToPreview = () => {
    setState((prev) => ({ ...prev, currentStep: 3 }));
  };

  // ── Step 3 → 4: valid rows from PreviewStep ───────────────────────────────
  const handleValidRows = (validRows: ValidatedRow[]) => {
    setState((prev) => ({ ...prev, validRows, currentStep: 4 }));
  };

  // ── Step 4 → 1: wizard complete, reset ────────────────────────────────────
  const handleComplete = () => {
    setState(INITIAL_STATE);
  };

  // ── Back navigation ───────────────────────────────────────────────────────
  const handleBackToStep1 = () => {
    setState((prev) => ({ ...prev, currentStep: 1 }));
  };

  const handleBackToStep2 = () => {
    setState((prev) => ({ ...prev, currentStep: 2 }));
  };

  const handleBackToStep3 = () => {
    setState((prev) => ({ ...prev, currentStep: 3 }));
  };

  const { currentStep, parsedData, headers, mappings, validRows, establishmentMeans, datasetName, datasetDescription } = state;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Upload Tree Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload tree biodiversity records from a CSV or KoboToolbox export.
        </p>
      </div>

      <StepIndicator currentStep={currentStep} />

      {/* Step 1: File drop */}
      {currentStep === 1 && (
        <FileDropStep onFileAndMappings={handleFileAndMappings} />
      )}

      {/* Step 2: Column mapping */}
      {currentStep === 2 && headers !== null && parsedData !== null && (
        <ColumnMappingStep
          headers={headers}
          mappings={mappings}
          sampleData={parsedData.slice(0, 5)}
          onMappingsChange={handleMappingsChange}
          onBack={handleBackToStep1}
          onNext={handleGoToPreview}
        />
      )}

      {/* Step 3: Preview & validate */}
      {currentStep === 3 && parsedData !== null && (
        <PreviewStep
          parsedData={parsedData}
          mappings={mappings}
          onBack={handleBackToStep2}
          onNext={handleValidRows}
        />
      )}

      {/* Step 4: Upload to PDS */}
      {currentStep === 4 && (
        <UploadStep
          validRows={validRows}
          establishmentMeans={establishmentMeans}
          datasetName={datasetName}
          datasetDescription={datasetDescription}
          onBack={handleBackToStep3}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
