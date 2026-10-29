import { SHAPE_ICONS, KIND_ICONS } from "../core/constants.js";
import { esc } from "../core/escape.js";
import { formatOrderedAt } from "../core/dates.js";
import { typeMeta } from "../domain/catalog.js";
import {
  normalizeOrder,
  orderTitle,
  orderOptionImage,
  unitCount,
  formatMoney,
  parseMoney,
  resolveOrderPricing
} from "../domain/order.js";
import { state } from "../app/state.js";
import { removeOrder } from "../data/orders-repository.js";
import { showToast } from "./toast.js";
import { renderUnitChecks } from "./checks.js";
import { openDialog } from "./order-form.js";

export function openViewDialog(order) {
  const viewDlg = document.getElementById("viewDlg");
  state.viewingOrder = order
    ? resolveOrderPricing(normalizeOrder(order, order.id), state.catalog)
    : null;
  if (!state.viewingOrder) return;
  const o = state.viewingOrder;
  const kindClass = o.kind === "resin" ? "resin" : o.kind === "pipeCleaner" ? "pipe" : "candle";
  const image = o.image || orderOptionImage(state.catalog, o.kind, o);
  const hero = document.getElementById("viewHero");
  hero.innerHTML = "";
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = o.shape || o.candleType || "Shape";
    hero.appendChild(img);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "view-fallback";
    fallback.textContent = SHAPE_ICONS[o.shape || o.candleType] || KIND_ICONS[o.kind] || "✦";
    hero.appendChild(fallback);
  }
  const badge = document.getElementById("viewBadge");
  badge.className = "view-badge " + kindClass;
  badge.textContent = o.kindName || typeMeta(o.kind).name;
  const qty = unitCount(o);
  document.getElementById("viewTitle").textContent =
    qty > 1 ? `${orderTitle(o)} · ×${qty}` : orderTitle(o);
  document.getElementById("viewSub").textContent =
    `${o.person || "Unnamed"} · Ordered ${formatOrderedAt(o.createdAt)}`;

  const amount = parseMoney(o.amount);
  const unitPrice = parseMoney(o.unitPrice);
  const amountLabel = amount === null
    ? null
    : qty > 1 && unitPrice !== null
      ? `${formatMoney(amount)} (${formatMoney(unitPrice)} × ${qty})`
      : formatMoney(amount);
  const rows = [
    ["Customer", o.person || "Unnamed"],
    ["Type", o.kindName || typeMeta(o.kind).name],
    ["Quantity", String(qty)],
    ["Amount", amountLabel],
    ["Shape", o.shape || o.candleType || "—"],
    ["Size", o.size || "—"],
    ["Color", o.color || "—"],
    ["Scent", o.kind === "candle" ? (o.scent || "—") : null],
    ["Notes", o.notes || "—"]
  ].filter(r => r[1] !== null);

  const grid = document.getElementById("viewGrid");
  grid.innerHTML = rows.map(([k, v]) =>
    `<div class="view-row"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`
  ).join("");

  const status = document.getElementById("viewStatus");
  status.className = "view-status unit-list";
  renderUnitChecks(o, status);

  viewDlg.showModal();
}

async function deleteViewingOrder() {
  if (!state.viewingOrder) return;
  const qty = unitCount(state.viewingOrder);
  const label = qty > 1
    ? `Delete this line (${qty} items) for ${state.viewingOrder.person || "Unnamed"}?`
    : `Delete this order for ${state.viewingOrder.person || "Unnamed"}? This cannot be undone.`;
  if (!confirm(label)) return;
  const viewDlg = document.getElementById("viewDlg");
  const id = state.viewingOrder.id;
  state.viewingOrder = null;
  if (viewDlg.open) viewDlg.close();
  try {
    await removeOrder(id);
    showToast("Order deleted");
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
}

export function bindViewDialog() {
  const viewDlg = document.getElementById("viewDlg");
  document.getElementById("closeViewDialog").onclick = () => {
    viewDlg.close();
    state.viewingOrder = null;
  };
  document.getElementById("viewEdit").onclick = () => {
    if (!state.viewingOrder) return;
    const order = state.viewingOrder;
    viewDlg.close();
    state.viewingOrder = null;
    openDialog(order);
  };
  document.getElementById("viewDelete").onclick = () => deleteViewingOrder();
  viewDlg.addEventListener("close", () => {
    state.viewingOrder = null;
  });
}
