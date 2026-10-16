import { SYNC_META_STORE } from "../core/constants.js";

export function readSyncMeta() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_META_STORE) || "{}") || {};
  } catch (e) {
    return {};
  }
}

export function writeSyncMeta(patch) {
  try {
    localStorage.setItem(
      SYNC_META_STORE,
      JSON.stringify({ ...readSyncMeta(), ...patch, updatedAt: Date.now() })
    );
  } catch (e) {
    /* ignore quota */
  }
}
