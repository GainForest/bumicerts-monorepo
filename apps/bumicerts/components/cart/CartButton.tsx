"use client";

import { useCartStore } from "@/components/stores/cart";
import { useModal } from "@/components/ui/modal/context";
import { CartModal } from "@/components/global/modals/cart/index";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { ShoppingCartIcon } from "lucide-react";

export function CartButton() {
  const count = useCartStore((s) => s.items.length);
  const { pushModal, show } = useModal();

  const handleOpen = () => {
    pushModal({ id: MODAL_IDS.CART, content: <CartModal /> }, true);
    show();
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      aria-label={`Cart${count > 0 ? ` (${count} item${count === 1 ? "" : "s"})` : ""}`}
      className="relative flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <ShoppingCartIcon className="size-[18px]" />

      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none"
          aria-hidden
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
