/** Storage keys and fixed catalog / display constants. */

export const STORE = "my-orders-v1";
export const CAT_STORE = "my-order-catalog-v2";
export const CAT_STORE_LEGACY = "my-order-categories-v1";
export const THEME = "my-orders-theme";
export const SYNC_META_STORE = "my-orders-sync-meta-v1";

export const FIXED_TYPES = [
  { id: "candle", name: "Candle" },
  { id: "resin", name: "Resin" },
  { id: "pipeCleaner", name: "Pipe Cleaner" }
];

export const CANDLE_COLOR_HEX = {
  Pink: "#ec4899",
  Orange: "#f97316",
  Blue: "#3b82f6",
  Red: "#ef4444",
  Violet: "#8b5cf6",
  Yellow: "#eab308",
  Green: "#22c55e",
  Mustard: "#ca8a04",
  Burgundy: "#9f1239"
};

export const SHAPE_ICONS = {
  "Teddy Bear": "🧸",
  "Closed rose": "🥀",
  "Open rose": "🌹",
  "Sea shell": "🐚",
  "Jasmine set": "💮",
  "Couple": "💑",
  "Mothichoor laddo": "🟡",
  "Sunflower": "🌻"
};

export const KIND_ICONS = { candle: "🕯️", resin: "✨", pipeCleaner: "🧶" };
