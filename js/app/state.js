/**
 * Mutable application state shared across presentation and data layers.
 * Domain modules stay pure; they receive snapshots, they do not import this.
 */

export const state = {
  orders: [],
  catalog: null,
  draftCatalog: null,
  activeTypeId: "candle",
  catSectionOpen: {},
  catImageTarget: null,
  editingId: null,
  typeFilter: "candle",
  statusFilter: "incomplete",
  collapsedGroups: new Set(),
  viewingOrder: null,
  toastTimer: null,
  db: null,
  unsubOrders: null,
  unsubCategories: null,
  cloudEnabled: false,
  firestorePersistenceReady: null,
  localOrdersUploadDone: false,
  localCatalogUploadDone: false
};

/** Optional UI refresh hook set by bootstrap. */
let renderFn = null;

export function setRender(fn) {
  renderFn = fn;
}

export function requestRender() {
  if (typeof renderFn === "function") {
    try {
      renderFn();
    } catch (e) {
      /* render may not be ready during early boot */
    }
  }
}
