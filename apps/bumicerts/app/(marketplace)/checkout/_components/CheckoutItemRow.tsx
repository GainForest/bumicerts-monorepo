"use client";

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
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, "");
              const parsed = parseFloat(val);
              if (!isNaN(parsed) && parsed >= 0) {
                onAmountChange(parsed);
              } else if (val === "" || val === ".") {
                onAmountChange(0);
              }
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
