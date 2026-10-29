import { state, requestRender } from "../app/state.js";
import {
  normalizeOrder,
  orderPayload,
  applyCatalogPricingToOrders
} from "../domain/order.js";
import { cacheLocalOrders, loadLocalOrders } from "./local-storage.js";

export function loadOrdersIntoState() {
  state.orders = loadLocalOrders();
  enrichOrdersWithCatalogPricing();
  return state.orders;
}

/**
 * Fill missing candle amounts from catalog prices (covers orders created before pricing).
 * Optionally writes the updated amounts back to Firebase.
 */
export async function enrichOrdersWithCatalogPricing({ persistCloud = false } = {}) {
  const { orders, changed } = applyCatalogPricingToOrders(state.orders, state.catalog);
  if (!changed.length) return [];
  state.orders = orders;
  cacheLocalOrders(state.orders);
  if (persistCloud && state.cloudEnabled && state.db) {
    await Promise.all(
      changed.map(o =>
        state.db.collection("orders").doc(o.id).set(orderPayload(o), { merge: true })
      )
    );
  }
  return changed;
}

export async function upsertOrder(order) {
  const o = normalizeOrder(order, order.id);
  if (state.cloudEnabled && state.db) {
    await state.db.collection("orders").doc(o.id).set(orderPayload(o), { merge: true });
    return o;
  }
  const idx = state.orders.findIndex(x => x.id === o.id);
  if (idx >= 0) state.orders[idx] = { ...state.orders[idx], ...o };
  else state.orders.push(o);
  cacheLocalOrders(state.orders);
  requestRender();
  return o;
}

export async function removeOrder(id) {
  if (state.cloudEnabled && state.db) {
    await state.db.collection("orders").doc(id).delete();
    return;
  }
  state.orders = state.orders.filter(x => x.id !== id);
  cacheLocalOrders(state.orders);
  requestRender();
}
