"use client";

import type { CheckoutItem } from "./hooks/useCheckoutFlow";
import { CheckoutItemRow } from "./CheckoutItemRow";
import { SetAllAmounts } from "./SetAllAmounts";

interface IndividualAmountsProps {
  items: CheckoutItem[];
  onItemAmountChange: (id: string, amount: number) => void;
  onRemoveItem: (id: string) => void;
  onSetAllAmounts: (amount: number) => void;
}

export function IndividualAmounts({
  items,
  onItemAmountChange,
  onRemoveItem,
  onSetAllAmounts,
}: IndividualAmountsProps) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      {/* Set all amounts — only show when there are multiple items */}
      {items.length > 1 && <SetAllAmounts onSetAllAmounts={onSetAllAmounts} />}

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
