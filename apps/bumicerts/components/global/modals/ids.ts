/** Centralized modal ID constants for all global modals. */
export const MODAL_IDS = {
  // Auth
  AUTH: "auth",

  // Cart
  CART: "cart",

  // Wallet linking
  WALLET_ADD: "wallet/add",
  WALLET_MANAGE: "wallet/manage",
  WALLET_DELETE: "wallet/delete",

  // Funding config (owner donation settings)
  FUNDING_CONFIG: "funding/config",

  // Donate flow
  DONATE_AMOUNT: "donate/amount",
  DONATE_WALLET: "donate/wallet",
  DONATE_CONFIRM: "donate/confirm",
  DONATE_SUCCESS: "donate/success",
  DONATE_LINK_WALLET: "donate/link-wallet",
} as const;

export type ModalId = (typeof MODAL_IDS)[keyof typeof MODAL_IDS];
