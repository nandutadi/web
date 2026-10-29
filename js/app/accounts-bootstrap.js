import { state, setRender, requestRender } from "./state.js";
import { setUiHooks } from "./ui-hooks.js";
import { todayLabelText } from "../core/dates.js";
import { hydrateFromBrowserCache, startOrdersSync, stopAllSync } from "../data/firestore-sync.js";
import { bindAccountsFilters, renderAccounts } from "../presentation/accounts.js";
import { bindViewDialog } from "../presentation/view-dialog.js";
import { initTheme } from "../presentation/theme.js";
import { setSyncStatus } from "../presentation/sync-status.js";

function onCatalogChanged() {
  requestRender();
}

function bindAuth() {
  document.getElementById("googleSignOut").onclick = async () => {
    stopAllSync();
    state.cloudEnabled = false;
    await ThanvisAuth.signOut();
  };
}

export function boot() {
  setRender(renderAccounts);
  setUiHooks({ onCatalogChanged, setSyncStatus });
  initTheme();
  document.getElementById("todayLabel").textContent = todayLabelText();
  bindAccountsFilters();
  bindViewDialog();
  bindAuth();
  hydrateFromBrowserCache();
  ThanvisAuth.onReady(() => {
    startOrdersSync();
  });
}

boot();
