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

  // Manage / org management
  MANAGE_IMAGE_EDITOR: "manage/image-editor",
  MANAGE_COUNTRY_SELECTOR: "manage/country-selector",
  MANAGE_WEBSITE_EDITOR: "manage/website-editor",
  MANAGE_START_DATE_SELECTOR: "manage/start-date-selector",
  MANAGE_VISIBILITY_SELECTOR: "manage/visibility-selector",
  MANAGE_PHOTO_ATTACH: "manage/photo-attach",
  MANAGE_TREE_ADD_TO_DATASET: "manage/tree-add-to-dataset",

  // Upload flows
  UPLOAD_TREES_COMPLETE: "upload/trees/complete",
} as const;

export type ModalId = (typeof MODAL_IDS)[keyof typeof MODAL_IDS];
