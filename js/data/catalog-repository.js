import { state, requestRender } from "../app/state.js";
import { notifyCatalogChanged } from "../app/ui-hooks.js";
import { cleanCatalog, categoriesPayload } from "../domain/catalog.js";
import { loadLocalCatalog, saveLocalCatalog } from "./local-storage.js";
import { showToast } from "../core/toast.js";

export function loadCatalogIntoState() {
  state.catalog = loadLocalCatalog();
  saveLocalCatalog(state.catalog);
  return state.catalog;
}

export async function persistCategories(data, { quiet = false } = {}) {
  state.catalog = cleanCatalog(data);
  saveLocalCatalog(state.catalog);
  if (state.cloudEnabled && state.db) {
    await state.db.collection("settings").doc("categories").set(categoriesPayload(state.catalog));
  }
  notifyCatalogChanged();
  requestRender();
  if (!quiet) {
    showToast(state.cloudEnabled ? "Categories saved to Firebase" : "Categories saved");
  }
}
