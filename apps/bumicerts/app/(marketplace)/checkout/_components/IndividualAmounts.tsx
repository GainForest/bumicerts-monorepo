"use client";

import type { CheckoutItem } from "./hooks/useCheckoutFlow";
import { CheckoutItemRow } from "./CheckoutItemRow";

interface IndividualAmountsProps {
  items: CheckoutItem[];
  onItemAmountChange: (id: string, amount: number) => void;
  onRemoveItem: (id: string) => void;
}

export function IndividualAmounts({
  items,
  onItemAmountChange,
  onRemoveItem,
}: IndividualAmountsProps) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="px-4">
        {items.map((item) => (
          <CheckoutItemRow
            key={item.id}
            title={item.title}
            organizationName={item.organizationName}
            amount={item.amount}
            onAmountChange={(amount) => onItemAmountChange(item.id, amount)}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
