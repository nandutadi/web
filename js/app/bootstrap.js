import { state, setRender } from "./state.js";
import { setUiHooks } from "./ui-hooks.js";
import { todayLabelText } from "../core/dates.js";
import { hydrateFromBrowserCache, startOrdersSync, stopAllSync } from "../data/firestore-sync.js";
import { render } from "../presentation/order-list.js";
import {
  bindOrderForm,
  renderTypeFilter,
  populateKindSelect,
  updateKindFields,
  readOrderAttrsFromForm
} from "../presentation/order-form.js";
import { bindViewDialog } from "../presentation/view-dialog.js";
import { bindCategoryDialog } from "../presentation/category-dialog.js";
import { bindImportExport } from "../presentation/import-export.js";
import { bindFilters } from "../presentation/filters.js";
import { bindShortcuts } from "../presentation/shortcuts.js";
import { initTheme } from "../presentation/theme.js";
import { setSyncStatus } from "../presentation/sync-status.js";

function onCatalogChanged() {
  renderTypeFilter();
  const kindEl = document.getElementById("f-kind");
  const dlg = document.getElementById("dlg");
  if (!kindEl) {
    populateKindSelect();
    return;
  }
  // Avoid clobbering in-progress order form fields while the dialog is open.
  if (dlg?.open) return;
  populateKindSelect(kindEl.value);
  updateKindFields(readOrderAttrsFromForm());
}

function bindAuth() {
  document.getElementById("googleSignOut").onclick = async () => {
    stopAllSync();
    state.cloudEnabled = false;
    await ThanvisAuth.signOut();
  };
}

export function boot() {
  setRender(render);
  setUiHooks({ onCatalogChanged, setSyncStatus });
  initTheme();
  document.getElementById("todayLabel").textContent = todayLabelText();

  bindOrderForm();
  bindViewDialog();
  bindCategoryDialog();
  bindImportExport();
  bindFilters();
  bindShortcuts();
  bindAuth();

  hydrateFromBrowserCache();
  ThanvisAuth.onReady(() => {
    startOrdersSync();
  });
}

boot();
