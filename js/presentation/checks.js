import { state, requestRender } from "../app/state.js";
import { normalizeOrder, normalizeUnit } from "../domain/order.js";
import { upsertOrder } from "../data/orders-repository.js";
import { showToast } from "./toast.js";

/**
 * Toggle a status flag on one unit within an order.
 * @param {object} order
 * @param {number} unitIndex
 * @param {"completed"|"delivered"|"paid"} key
 * @param {string} label
 * @param {boolean} [paid]
 */
export function makeUnitCheck(order, unitIndex, key, label, paid = false) {
  const units = (order.units || []).map(normalizeUnit);
  const unit = units[unitIndex] || normalizeUnit();
  const lab = document.createElement("label");
  lab.className = "check" + (paid ? " paid" : "") + (unit[key] ? " on" : "");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!unit[key];
  const itemLabel = units.length > 1 ? `item ${unitIndex + 1}` : (order.person || "order");
  input.setAttribute("aria-label", `${label} for ${itemLabel}`);
  input.addEventListener("change", async e => {
    e.stopPropagation();
    const nextUnits = units.map((u, i) =>
      i === unitIndex ? { ...u, [key]: input.checked } : { ...u }
    );
    const next = normalizeOrder({ ...order, units: nextUnits, qty: nextUnits.length }, order.id);
    try {
      await upsertOrder(next);
      Object.assign(order, next);
      lab.classList.toggle("on", input.checked);
      if (state.viewingOrder?.id === order.id) {
        state.viewingOrder = normalizeOrder(next, next.id);
      }
      showToast(
        units.length > 1
          ? `${label} · item ${unitIndex + 1}${input.checked ? " marked" : " unmarked"}`
          : label + (input.checked ? " marked" : " unmarked")
      );
      requestRender();
    } catch (err) {
      input.checked = !input.checked;
      alert("Update failed: " + err.message);
    }
  });
  lab.append(input, document.createTextNode(label));
  return lab;
}

/** @deprecated Prefer makeUnitCheck — kept for single-unit convenience wrappers. */
export function makeCheck(o, key, label, paid = false) {
  return makeUnitCheck(o, 0, key, label, paid);
}

export function renderUnitChecks(order, container, { numbered = true } = {}) {
  container.innerHTML = "";
  const units = order.units?.length ? order.units : [normalizeUnit(order)];
  units.forEach((unit, index) => {
    const row = document.createElement("div");
    row.className = "unit-row" + (unit.completed && unit.delivered && unit.paid ? " done" : "");
    if (numbered && units.length > 1) {
      const tag = document.createElement("span");
      tag.className = "unit-label";
      tag.textContent = `#${index + 1}`;
      row.appendChild(tag);
    }
    const checks = document.createElement("div");
    checks.className = "checks";
    checks.append(
      makeUnitCheck(order, index, "completed", "Completed"),
      makeUnitCheck(order, index, "delivered", "Delivered"),
      makeUnitCheck(order, index, "paid", "Payment Received", true)
    );
    row.appendChild(checks);
    container.appendChild(row);
  });
}
