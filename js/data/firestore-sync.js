import { state, requestRender } from "../app/state.js";
import { notifyCatalogChanged, notifySyncStatus } from "../app/ui-hooks.js";
import {
  normalizeCatalog,
  categoriesPayload
} from "../domain/catalog.js";
import { normalizeOrder, orderPayload } from "../domain/order.js";
import {
  loadLocalOrders,
  cacheLocalOrders,
  loadLocalCatalog,
  saveLocalCatalog
} from "./local-storage.js";
import { writeSyncMeta, readSyncMeta } from "./sync-meta.js";
import { showToast } from "../core/toast.js";

export function stopOrdersListener() {
  if (state.unsubOrders) {
    state.unsubOrders();
    state.unsubOrders = null;
  }
}

export function stopCategoriesListener() {
  if (state.unsubCategories) {
    state.unsubCategories();
    state.unsubCategories = null;
  }
}

export function stopAllSync() {
  stopOrdersListener();
  stopCategoriesListener();
}

async function ensureFirestorePersistence() {
  if (state.firestorePersistenceReady) return state.firestorePersistenceReady;
  state.firestorePersistenceReady = (async () => {
    const fs = firebase.firestore();
    try {
      fs.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
    } catch (err) {
      // Already initialized in this page lifetime
    }
    try {
      await fs.enablePersistence({ synchronizeTabs: true });
      return true;
    } catch (err) {
      console.warn("Firestore persistence unavailable", err?.code || err);
      return false;
    }
  })();
  return state.firestorePersistenceReady;
}

async function uploadMissingLocalOrders(cloudIds) {
  if (state.localOrdersUploadDone) return;
  state.localOrdersUploadDone = true;
  const local = loadLocalOrders();
  let uploaded = 0;
  for (const item of local) {
    const o = normalizeOrder(item);
    if (!cloudIds.has(o.id)) {
      await state.db.collection("orders").doc(o.id).set(orderPayload(o), { merge: true });
      uploaded++;
    }
  }
  if (uploaded) {
    showToast(`Uploaded ${uploaded} local order${uploaded === 1 ? "" : "s"} to Firebase`);
  }
}

async function startCategoriesSync() {
  stopCategoriesListener();
  if (!state.db || !firebase.auth().currentUser) return;
  const ref = state.db.collection("settings").doc("categories");

  state.unsubCategories = ref.onSnapshot({ includeMetadataChanges: true }, async doc => {
    if (document.getElementById("catDlg")?.open) return;
    const fromCache = !!doc.metadata?.fromCache;

    if (!doc.exists) {
      if (!fromCache && !state.localCatalogUploadDone) {
        state.localCatalogUploadDone = true;
        try {
          await ref.set(categoriesPayload(loadLocalCatalog()));
        } catch (err) {
          console.error(err);
          showToast("Categories sync setup failed: " + err.message);
        }
      }
      return;
    }

    const data = doc.data() || {};
    const cloudCatalog = data.catalog || data.types || null;
    if (!cloudCatalog) {
      if (!fromCache && !state.localCatalogUploadDone) {
        state.localCatalogUploadDone = true;
        try {
          await ref.set(categoriesPayload(loadLocalCatalog()));
        } catch (err) {
          console.error(err);
        }
      }
      return;
    }

    if (!fromCache && (Array.isArray(cloudCatalog) || !cloudCatalog.version) && !state.localCatalogUploadDone) {
      state.localCatalogUploadDone = true;
      try {
        await ref.set(categoriesPayload(normalizeCatalog(cloudCatalog)));
      } catch (err) {
        console.error(err);
      }
      return;
    }

    state.catalog = normalizeCatalog(cloudCatalog);
    saveLocalCatalog(state.catalog);
    writeSyncMeta({ catalogCachedAt: Date.now() });
    notifyCatalogChanged();
    requestRender();
  }, err => {
    console.error(err);
    state.catalog = loadLocalCatalog();
    notifyCatalogChanged();
    showToast("Categories sync error: " + err.message);
  });
}

export async function startOrdersSync() {
  stopAllSync();
  if (!firebase.auth().currentUser) return;

  state.orders = loadLocalOrders();
  state.catalog = loadLocalCatalog();
  notifyCatalogChanged();
  requestRender();
  notifySyncStatus("connecting", state.orders.length ? "Cached · syncing…" : "Syncing…");

  try {
    await ensureFirestorePersistence();
    state.db = firebase.firestore();
    state.cloudEnabled = true;
    state.localOrdersUploadDone = false;
    state.localCatalogUploadDone = false;

    startCategoriesSync();

    state.unsubOrders = state.db.collection("orders").onSnapshot({ includeMetadataChanges: true }, async snap => {
      const fromCache = !!snap.metadata?.fromCache;
      state.orders = snap.docs.map(doc => normalizeOrder(doc.data(), doc.id));
      cacheLocalOrders(state.orders);
      state.cloudEnabled = true;
      writeSyncMeta({ lastSyncedAt: Date.now(), fromCache: !!fromCache });

      const email = firebase.auth().currentUser?.email;
      if (fromCache) {
        notifySyncStatus("local", email ? `Cached · ${email}` : "Cached data");
      } else {
        notifySyncStatus("cloud", email ? `Synced · ${email}` : "Synced with Firebase");
        const cloudIds = new Set(snap.docs.map(d => d.id));
        try {
          await uploadMissingLocalOrders(cloudIds);
        } catch (err) {
          console.error(err);
        }
      }
      requestRender();
    }, err => {
      console.error(err);
      state.cloudEnabled = false;
      state.orders = loadLocalOrders();
      notifySyncStatus("error", "Permission error · using cache");
      requestRender();
      showToast("Firebase error: " + err.message);
    });
  } catch (err) {
    console.error(err);
    state.cloudEnabled = false;
    state.orders = loadLocalOrders();
    state.catalog = loadLocalCatalog();
    notifySyncStatus("error", "Offline · using cache");
    requestRender();
    showToast("Could not sync: " + err.message);
  }
}

export function hydrateFromBrowserCache() {
  state.orders = loadLocalOrders();
  state.catalog = loadLocalCatalog();
  saveLocalCatalog(state.catalog);
  notifyCatalogChanged();
  requestRender();
  const meta = readSyncMeta();
  if (state.orders.length || meta.lastSyncedAt) {
    notifySyncStatus("local", meta.lastSyncedAt ? "Cached · opening…" : "Local cache");
  }
}
