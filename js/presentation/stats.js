import { FIXED_TYPES } from "../core/constants.js";
import { esc } from "../core/escape.js";
import { typeMeta } from "../domain/catalog.js";
import { countUnits } from "../domain/order.js";
import { state } from "../app/state.js";

function personOrSearchActive() {
  return !!(
    document.getElementById("filterPerson")?.value ||
    document.getElementById("search")?.value.trim()
  );
}

function statsScopeLabel() {
  const person = document.getElementById("filterPerson")?.value || "";
  const q = document.getElementById("search")?.value.trim() || "";
  const bits = [];
  if (state.typeFilter) bits.push(typeMeta(state.typeFilter).name);
  if (state.statusFilter === "incomplete") bits.push("Not completed");
  if (state.statusFilter === "open") bits.push("Open");
  if (state.statusFilter === "closed" || state.statusFilter === "done") bits.push("Closed");
  if (state.statusFilter === "unpaid") bits.push("Unpaid");
  if (person) bits.push(person);
  if (q) bits.push(`“${q}”`);
  return bits.length ? bits.join(" · ") : "Across all customers";
}

function countOpenUnits(orders) {
  return orders.reduce((sum, o) => {
    const units = o.units?.length ? o.units : [{ completed: o.completed, delivered: o.delivered, paid: o.paid }];
    return sum + units.filter(u => !(u.completed && u.delivered && u.paid)).length;
  }, 0);
}

function countClosedUnits(orders) {
  return orders.reduce((sum, o) => {
    const units = o.units?.length ? o.units : [{ completed: o.completed, delivered: o.delivered, paid: o.paid }];
    return sum + units.filter(u => u.completed && u.delivered && u.paid).length;
  }, 0);
}

function countUnpaidUnits(orders) {
  return orders.reduce((sum, o) => {
    const units = o.units?.length ? o.units : [{ paid: o.paid }];
    return sum + units.filter(u => !u.paid).length;
  }, 0);
}

export function renderStats(visible) {
  const scope = statsScopeLabel();
  const filtered = !!state.typeFilter || !!state.statusFilter || personOrSearchActive();
  const isClosedFilter = state.statusFilter === "closed" || state.statusFilter === "done";
  const isIncompleteFilter = state.statusFilter === "incomplete";
  const cards = [];
  const totalPieces = countUnits(visible);

  cards.push({
    cls: state.statusFilter === "open" || isIncompleteFilter
      ? "open"
      : isClosedFilter
        ? "closed"
        : state.statusFilter === "unpaid"
          ? "unpaid"
          : "",
    label: "Total items",
    icon: "▦",
    count: totalPieces,
    sub: visible.length === totalPieces
      ? scope
      : `${visible.length} line${visible.length === 1 ? "" : "s"} · ${scope}`
  });

  if (state.statusFilter !== "open" && !isClosedFilter && !isIncompleteFilter) {
    cards.push({
      cls: "open",
      label: "Open items",
      icon: "◷",
      count: countOpenUnits(visible),
      sub: filtered ? "In current filter" : "Missing a status step"
    });
  }

  if (!isClosedFilter && !isIncompleteFilter && state.statusFilter !== "open" && state.statusFilter !== "unpaid") {
    cards.push({
      cls: "closed",
      label: "Closed items",
      icon: "✓",
      count: countClosedUnits(visible),
      sub: "Completed · Delivered · Payment Received"
    });
  }

  if (!state.typeFilter) {
    for (const t of FIXED_TYPES) {
      const cls = t.id === "candle" ? "candles" : t.id === "resin" ? "resin" : "open";
      const icon = t.id === "candle" ? "♨" : t.id === "resin" ? "✧" : "◍";
      const typeOrders = visible.filter(o => o.kind === t.id);
      cards.push({
        cls,
        label: t.name,
        icon,
        count: countUnits(typeOrders),
        sub: filtered ? "In current filter" : "By order type"
      });
    }
  }

  if (state.statusFilter !== "unpaid") {
    cards.push({
      cls: "unpaid",
      label: "Unpaid",
      icon: "₹",
      count: countUnpaidUnits(visible),
      sub: filtered ? "In current filter" : "Payment to follow up"
    });
  }

  document.getElementById("stats").innerHTML = cards.map(c => `
    <article class="stat ${esc(c.cls)}">
      <div class="stat-head"><span class="stat-label">${esc(c.label)}</span><span class="stat-icon">${c.icon}</span></div>
      <div class="stat-value">${c.count}</div>
      <div class="stat-sub">${esc(c.sub)}</div>
    </article>`).join("");
}
