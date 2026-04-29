import { ClockIcon } from "lucide-react";

export function TimelineEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
      <ClockIcon className="h-9 w-9 opacity-30" />
      <p className="text-sm font-medium">No evidence uploaded yet</p>
      <p className="text-xs max-w-xs leading-relaxed">
        Evidence reports, audits, and field notes published by this organization
        will appear here.
      </p>
    </div>
  );
}
