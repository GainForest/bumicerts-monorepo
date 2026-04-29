"use client";

import { cn } from "@/lib/utils";
import { CheckIcon, CircleCheck, CircleDashed } from "lucide-react";

function CheckRow({
  selected,
  onToggle,
  primary,
  secondary,
  disabled,
  icon: Icon,
}: {
  selected: boolean;
  onToggle: () => void;
  primary: string;
  secondary?: string;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full bg-background hover:bg-accent flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-150",
        selected ? "bg-accent" : "",
      )}
      disabled={disabled}
    >
      {/* Custom checkbox */}
      {selected ? (
        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center p-0.5">
          <CheckIcon className="text-primary-foreground" />
        </div>
      ) : (
        <CircleDashed className="size-4 text-muted-foreground" />
      )}
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium text-foreground truncate",
            selected && "text-primary",
          )}
        >
          {primary}
        </p>
        {secondary && (
          <p className="text-xs text-muted-foreground truncate">{secondary}</p>
        )}
      </div>
    </button>
  );
}

export default CheckRow;
