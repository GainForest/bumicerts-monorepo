"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutItemRowProps {
  title: string;
  organizationName: string;
  amount: number;
  onAmountChange?: (amount: number) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

export function CheckoutItemRow({
  title,
  organizationName,
  amount,
  onAmountChange,
  onRemove,
  readOnly = false,
}: CheckoutItemRowProps) {
  // Track raw input string to allow typing decimals (e.g., "0.")
  // We control this locally and only sync back to parent on valid changes
  const [inputValue, setInputValue] = useState<string>(() => String(amount));
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p
          className="text-base font-medium leading-tight truncate"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          {title || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-1">
          {organizationName}
        </p>
      </div>

      {!readOnly && onAmountChange ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm text-muted-foreground">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, "");
              setInputValue(val);
              
              // Only call onAmountChange when we have a complete number
              // Skip if ends with "." (user still typing decimals like "0." or "25.")
              if (val && !val.endsWith(".")) {
                const parsed = parseFloat(val);
                if (!isNaN(parsed) && parsed >= 0) {
                  onAmountChange(parsed);
                }
              } else if (val === "") {
                onAmountChange(0);
              }
            }}
            onBlur={() => {
              // On blur, finalize the value and clean up formatting
              const parsed = parseFloat(inputValue) || 0;
              onAmountChange(parsed);
              setInputValue(parsed === 0 ? "" : String(parsed));
            }}
            className={cn(
              "w-20 bg-transparent border border-border rounded-xl px-3 py-1.5",
              "text-sm font-medium text-right outline-none",
              "transition-colors focus:border-primary/50"
            )}
          />
        </div>
      ) : (
        <span className="text-sm font-medium shrink-0">
          ${amount.toFixed(2)}
        </span>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="size-8 text-muted-foreground hover:text-destructive transition-colors shrink-0"
        onClick={onRemove}
        title="Remove from cart"
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
