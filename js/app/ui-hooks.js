/**
 * Presentation callbacks registered by bootstrap.
 * Keeps the data layer free of direct UI imports.
 */

const hooks = {
  onCatalogChanged: null,
  setSyncStatus: null
};

export function setUiHooks(next) {
  Object.assign(hooks, next);
}

export function notifyCatalogChanged() {
  if (typeof hooks.onCatalogChanged === "function") {
    try {
      hooks.onCatalogChanged();
    } catch (e) {
      console.error(e);
    }
  }
}

export function notifySyncStatus(mode, label) {
  if (typeof hooks.setSyncStatus === "function") {
    try {
      hooks.setSyncStatus(mode, label);
    } catch (e) {
      console.error(e);
    }
  }
}
