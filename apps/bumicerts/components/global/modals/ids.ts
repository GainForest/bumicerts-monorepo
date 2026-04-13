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

  // Upload / org management
  UPLOAD_IMAGE_EDITOR: "upload/image-editor",
  UPLOAD_COUNTRY_SELECTOR: "upload/country-selector",
  UPLOAD_WEBSITE_EDITOR: "upload/website-editor",
  UPLOAD_START_DATE_SELECTOR: "upload/start-date-selector",
  UPLOAD_VISIBILITY_SELECTOR: "upload/visibility-selector",
  UPLOAD_PHOTO_ATTACH: "upload/photo-attach",
} as const;

export type ModalId = (typeof MODAL_IDS)[keyof typeof MODAL_IDS];
