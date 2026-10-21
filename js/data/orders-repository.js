import { state, requestRender } from "../app/state.js";
import { normalizeOrder, orderPayload } from "../domain/order.js";
import { cacheLocalOrders, loadLocalOrders } from "./local-storage.js";

export function loadOrdersIntoState() {
  state.orders = loadLocalOrders();
  return state.orders;
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
