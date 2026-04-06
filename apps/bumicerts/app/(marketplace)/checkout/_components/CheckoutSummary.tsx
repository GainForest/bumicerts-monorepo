"use client";

import type { CheckoutItem } from "./hooks/useCheckoutFlow";

interface CheckoutSummaryProps {
  items: CheckoutItem[];
  totalAmount: number;
}

export function CheckoutSummary({ items, totalAmount }: CheckoutSummaryProps) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
          Summary
        </span>
      </div>
      <div className="px-4 py-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground truncate max-w-48">
              {item.title}
            </span>
            <span className="font-medium">${item.amount.toFixed(2)}</span>
          </div>
        ))}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-3" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span
            className="text-xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            ${totalAmount.toFixed(2)} USDC
          </span>
        </div>
      </div>
    </div>
  );
}
