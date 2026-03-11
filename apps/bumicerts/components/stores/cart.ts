import { create } from "zustand";
import { persist } from "zustand/middleware";

type CartState = {
  /** Bumicert IDs in the cart (format: "{did}-{rkey}") */
  items: string[];
};

type CartActions = {
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  isInCart: (id: string) => boolean;
  clearCart: () => void;
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (id) =>
        set((state) => ({
          items: state.items.includes(id) ? state.items : [...state.items, id],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i !== id),
        })),

      isInCart: (id) => get().items.includes(id),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "bumicerts-cart",
    }
  )
);
