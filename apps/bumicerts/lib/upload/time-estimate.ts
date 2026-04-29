export type UploadTimeEstimateInput = {
  startedAtMs: number | null;
  nowMs: number;
  completedUnits: number;
  totalUnits: number;
  isComplete: boolean;
  unitLabel: string;
};

export type UploadTimeEstimate = {
  label: string;
  description: string;
};

function toFiniteWholeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function pluralizeUnit(unitLabel: string, count: number): string {
  return count === 1 ? unitLabel : `${unitLabel}s`;
}

export function formatUploadDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "a few seconds";
  }

  const totalSeconds = Math.max(1, Math.ceil(milliseconds / 1_000));

  if (totalSeconds < 5) {
    return "a few seconds";
  }

  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const totalMinutes = Math.ceil(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const dayLabel = days === 1 ? "day" : "days";

  return remainingHours === 0
    ? `${days} ${dayLabel}`
    : `${days} ${dayLabel} ${remainingHours} hr`;
}

export function getUploadTimeEstimate({
  startedAtMs,
  nowMs,
  completedUnits,
  totalUnits,
  isComplete,
  unitLabel,
}: UploadTimeEstimateInput): UploadTimeEstimate {
  const boundedTotal = toFiniteWholeCount(totalUnits);
  const boundedCompleted = Math.min(
    toFiniteWholeCount(completedUnits),
    boundedTotal,
  );
  const pluralUnit = pluralizeUnit(unitLabel, boundedTotal);

  if (boundedTotal === 0) {
    return {
      label: `No ${pluralUnit} to upload`,
      description: "There is no upload work to estimate.",
    };
  }

  if (startedAtMs === null) {
    return {
      label: "Preparing estimate…",
      description: "A time estimate will appear when processing begins.",
    };
  }

  const elapsedMs = Math.max(0, nowMs - startedAtMs);

  if (isComplete) {
    return {
      label: `Finished in ${formatUploadDuration(elapsedMs)}`,
      description: `Processed ${boundedTotal.toLocaleString()} ${pluralUnit}.`,
    };
  }

  if (boundedCompleted === 0) {
    return {
      label: `Estimating after the first ${unitLabel}…`,
      description: `Timing starts once the first ${unitLabel} finishes.`,
    };
  }

  const remainingUnits = boundedTotal - boundedCompleted;

  if (remainingUnits === 0) {
    return {
      label: "Finalizing upload…",
      description: `All ${boundedTotal.toLocaleString()} ${pluralUnit} processed; wrapping up.`,
    };
  }

  const averageMsPerUnit = elapsedMs > 0 ? elapsedMs / boundedCompleted : 1_000;
  const remainingMs = remainingUnits * averageMsPerUnit;

  return {
    label: `About ${formatUploadDuration(remainingMs)} remaining`,
    description: `Based on ${boundedCompleted.toLocaleString()} of ${boundedTotal.toLocaleString()} ${pluralUnit} processed.`,
  };
}
