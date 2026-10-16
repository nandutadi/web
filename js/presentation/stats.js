import { FIXED_TYPES } from "../core/constants.js";
import { esc } from "../core/escape.js";
import { typeMeta } from "../domain/catalog.js";
import { isFullyDone } from "../domain/order.js";
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
  if (state.statusFilter === "open") bits.push("Open");
  if (state.statusFilter === "closed" || state.statusFilter === "done") bits.push("Closed");
  if (state.statusFilter === "unpaid") bits.push("Unpaid");
  if (person) bits.push(person);
  if (q) bits.push(`“${q}”`);
  return bits.length ? bits.join(" · ") : "Across all customers";
}

export function renderStats(visible) {
  const scope = statsScopeLabel();
  const filtered = !!state.typeFilter || !!state.statusFilter || personOrSearchActive();
  const isClosedFilter = state.statusFilter === "closed" || state.statusFilter === "done";
  const cards = [];

  cards.push({
    cls: state.statusFilter === "open"
      ? "open"
      : isClosedFilter
        ? "closed"
        : state.statusFilter === "unpaid"
          ? "unpaid"
          : "",
    label: "Total orders",
    icon: "▦",
    count: visible.length,
    sub: scope
  });

  if (state.statusFilter !== "open" && !isClosedFilter) {
    cards.push({
      cls: "open",
      label: "Open orders",
      icon: "◷",
      count: visible.filter(o => !isFullyDone(o)).length,
      sub: filtered ? "In current filter" : "Missing a status step"
    });
  }

  if (!isClosedFilter && state.statusFilter !== "open" && state.statusFilter !== "unpaid") {
    cards.push({
      cls: "closed",
      label: "Closed orders",
      icon: "✓",
      count: visible.filter(o => isFullyDone(o)).length,
      sub: "Completed · Delivered · Payment Received"
    });
  }

  if (!state.typeFilter) {
    for (const t of FIXED_TYPES) {
      const cls = t.id === "candle" ? "candles" : t.id === "resin" ? "resin" : "open";
      const icon = t.id === "candle" ? "♨" : t.id === "resin" ? "✧" : "◍";
      cards.push({
        cls,
        label: t.name,
        icon,
        count: visible.filter(o => o.kind === t.id).length,
        sub: filtered ? "In current filter" : "By order type"
      });
    }
  }

  if (state.statusFilter !== "unpaid") {
    cards.push({
      cls: "unpaid",
      label: "Unpaid",
      icon: "₹",
      count: visible.filter(o => !o.paid).length,
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
