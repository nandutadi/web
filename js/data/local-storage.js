import { STORE, CAT_STORE, CAT_STORE_LEGACY } from "../core/constants.js";
import { defaultCatalog, normalizeCatalog } from "../domain/catalog.js";
import { showToast } from "../core/toast.js";

export function loadLocalOrders() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not read saved orders", e);
  }
  return [];
}

export function cacheLocalOrders(orders) {
  try {
    localStorage.setItem(STORE, JSON.stringify(orders));
  } catch (e) {
    showToast("Could not cache locally. Export a backup.");
  }
}

export function loadLocalCatalog() {
  try {
    const raw = localStorage.getItem(CAT_STORE);
    if (raw) return normalizeCatalog(JSON.parse(raw));
    const legacy = localStorage.getItem(CAT_STORE_LEGACY);
    if (legacy) return normalizeCatalog(JSON.parse(legacy));
  } catch (e) {
    console.warn("Could not read catalog", e);
  }
  return defaultCatalog();
}

export function saveLocalCatalog(catalog) {
  try {
    localStorage.setItem(CAT_STORE, JSON.stringify(catalog));
  } catch (e) {
    showToast("Could not cache categories locally.");
  }
}
