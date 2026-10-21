import { FIXED_TYPES } from "../core/constants.js";
import { esc } from "../core/escape.js";
import { findOpt, resinShapes, typeMeta } from "../domain/catalog.js";
import { state } from "../app/state.js";
import {
  toDatetimeLocalValue,
  fromDatetimeLocalValue
} from "../core/dates.js";
import {
  normalizeKind,
  attrsFromOrder,
  normalizeOrder,
  orderOptionImage,
  clampQty,
  resizeUnits,
  unitCount
} from "../domain/order.js";
import { upsertOrder } from "../data/orders-repository.js";
import { showToast } from "./toast.js";

export function populateKindSelect(selectedId) {
  const el = document.getElementById("f-kind");
  if (!el) return;
  const preferred = normalizeKind(selectedId || el.value || "candle");
  el.innerHTML = FIXED_TYPES.map(
    t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`
  ).join("");
  el.value = preferred;
}

export function makeAttrSelect(id, label, options, selectedId, selectedName, { required = false, onChange = null } = {}) {
  const field = document.createElement("div");
  field.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.innerHTML = required ? `${esc(label)} <span aria-hidden="true">*</span>` : esc(label);
  const sel = document.createElement("select");
  sel.id = id;
  if (required) sel.required = true;
  sel.innerHTML =
    `<option value="">Choose ${esc(label.toLowerCase())}…</option>` +
    options.map(o => `<option value="${esc(o.id)}" data-name="${esc(o.name)}">${esc(o.name)}</option>`).join("");
  const match = findOpt(options, selectedId) || findOpt(options, selectedName);
  if (match) sel.value = match.id;
  if (onChange) sel.addEventListener("change", onChange);
  field.append(lab, sel);
  return field;
}

export function readOrderAttrsFromForm() {
  const pick = id => {
    const el = document.getElementById(id);
    if (!el || !el.value) return { id: "", name: "" };
    const opt = el.selectedOptions[0];
    return { id: el.value, name: opt?.dataset.name || opt?.textContent || "" };
  };
  return {
    shape: pick("f-shape"),
    color: pick("f-color"),
    scent: pick("f-scent"),
    size: pick("f-size")
  };
}

export function updateKindFields(preset = null) {
  const wrap = document.getElementById("orderAttrFields");
  if (!wrap || !state.catalog) return;
  wrap.innerHTML = "";
  const kind = normalizeKind(document.getElementById("f-kind").value);
  const values = preset || {};
  const catalog = state.catalog;

  if (kind === "candle") {
    wrap.append(
      makeAttrSelect(
        "f-shape", "Shape", catalog.candle.shapes,
        values.shapeId || values.shape?.id,
        values.shapeName || values.shape?.name || values.shape,
        { required: !!catalog.candle.shapes.length }
      ),
      makeAttrSelect(
        "f-color", "Color", catalog.candle.colors,
        values.colorId || values.color?.id,
        values.colorName || values.color?.name || values.color
      ),
      makeAttrSelect(
        "f-scent", "Scent", catalog.candle.scents,
        values.scentId || values.scent?.id,
        values.scentName || values.scent?.name || values.scent
      )
    );
    return;
  }

  if (kind === "resin") {
    const shapes = resinShapes(catalog);
    const shapeField = makeAttrSelect(
      "f-shape", "Shape", shapes,
      values.shapeId || values.shape?.id,
      values.shapeName || values.shape?.name || values.shape,
      {
        required: !!shapes.length,
        onChange: () => {
          const current = readOrderAttrsFromForm();
          updateKindFields({
            shapeId: current.shape.id,
            shapeName: current.shape.name,
            colorId: current.color.id,
            colorName: current.color.name,
            sizeId: "",
            sizeName: ""
          });
        }
      }
    );
    wrap.appendChild(shapeField);
    const selectedShape =
      findOpt(shapes, document.getElementById("f-shape")?.value) ||
      findOpt(shapes, values.shapeId) ||
      findOpt(shapes, values.shapeName || values.shape);
    const sizes = selectedShape?.sizes || [];
    if (sizes.length) {
      wrap.appendChild(
        makeAttrSelect(
          "f-size", "Size / dimension", sizes,
          values.sizeId || values.size?.id,
          values.sizeName || values.size?.name || values.size
        )
      );
    }
    wrap.appendChild(
      makeAttrSelect(
        "f-color", "Color", catalog.resin.colors,
        values.colorId || values.color?.id,
        values.colorName || values.color?.name || values.color
      )
    );
    return;
  }

  if (kind === "pipeCleaner") {
    wrap.append(
      makeAttrSelect(
        "f-shape", "Shape", catalog.pipeCleaner.shapes,
        values.shapeId || values.shape?.id,
        values.shapeName || values.shape?.name || values.shape,
        { required: !!catalog.pipeCleaner.shapes.length }
      ),
      makeAttrSelect(
        "f-size", "Size", catalog.pipeCleaner.sizes,
        values.sizeId || values.size?.id,
        values.sizeName || values.size?.name || values.size
      ),
      makeAttrSelect(
        "f-color", "Color", catalog.pipeCleaner.colors,
        values.colorId || values.color?.id,
        values.colorName || values.color?.name || values.color
      )
    );
  }
}

export function renderTypeFilter() {
  const host = document.getElementById("typeFilter");
  if (!host) return;
  const current = state.typeFilter;
  host.innerHTML =
    `<button type="button" data-type="" class="${current ? "" : "on"}">All items</button>` +
    FIXED_TYPES.map(
      t => `<button type="button" data-type="${esc(t.id)}" class="${current === t.id ? "on" : ""}">${esc(t.name)}</button>`
    ).join("");
}

export function openDialog(order) {
  const dlg = document.getElementById("dlg");
  const isEdit = !!(order && order.id);
  state.editingId = isEdit ? order.id : null;
  document.getElementById("dlgTitle").textContent = isEdit ? "Edit order" : "Add an order";
  document.getElementById("f-person").value = order?.person ?? "";
  document.getElementById("f-ordered").value = toDatetimeLocalValue(
    isEdit ? (order.createdAt || Date.now()) : Date.now()
  );
  populateKindSelect(isEdit ? order.kind : "candle");
  document.getElementById("f-qty").value = String(isEdit ? unitCount(order) : 1);
  document.getElementById("f-notes").value = isEdit ? (order.notes ?? "") : "";
  updateKindFields(isEdit ? attrsFromOrder(order) : null);
  dlg.showModal();
  if (!isEdit && order?.person) document.getElementById("f-kind").focus();
  else document.getElementById("f-person").focus();
}

export function bindOrderForm() {
  const dlg = document.getElementById("dlg");
  document.getElementById("f-kind").addEventListener("change", () => updateKindFields(null));
  document.getElementById("add").onclick = () => openDialog(null);
  document.getElementById("cancel").onclick = () => dlg.close();
  document.getElementById("closeDialog").onclick = () => dlg.close();

  document.getElementById("form").addEventListener("submit", async e => {
    e.preventDefault();
    const kind = normalizeKind(document.getElementById("f-kind").value);
    const person = document.getElementById("f-person").value.trim();
    if (!person) {
      document.getElementById("f-person").focus();
      return;
    }
    if (!document.getElementById("f-ordered").value) {
      document.getElementById("f-ordered").focus();
      return;
    }
    const attrs = readOrderAttrsFromForm();
    const shapeRequired = !!document.getElementById("f-shape")?.required;
    if (shapeRequired && !attrs.shape.id) {
      document.getElementById("f-shape")?.focus();
      showToast("Choose a shape");
      return;
    }
    const existing = state.editingId
      ? state.orders.find(o => o.id === state.editingId)
      : null;
    const qty = clampQty(document.getElementById("f-qty").value);
    const units = resizeUnits(
      existing?.units?.length
        ? existing.units
        : existing
          ? [{
              completed: !!existing.completed,
              delivered: !!existing.delivered,
              paid: !!existing.paid
            }]
          : [],
      qty
    );
    const order = normalizeOrder({
      id: state.editingId || crypto.randomUUID(),
      createdAt: fromDatetimeLocalValue(document.getElementById("f-ordered").value),
      person,
      kind,
      kindName: typeMeta(kind).name,
      shape: attrs.shape.name,
      shapeId: attrs.shape.id,
      color: attrs.color.name,
      colorId: attrs.color.id,
      scent: kind === "candle" ? attrs.scent.name : "",
      scentId: kind === "candle" ? attrs.scent.id : "",
      size: (kind === "resin" || kind === "pipeCleaner") ? attrs.size.name : "",
      sizeId: (kind === "resin" || kind === "pipeCleaner") ? attrs.size.id : "",
      candleType: kind === "candle" ? attrs.shape.name : "",
      units,
      qty,
      notes: document.getElementById("f-notes").value.trim(),
      image: existing?.image || orderOptionImage(state.catalog, kind, {
        shapeId: attrs.shape.id,
        shape: attrs.shape.name,
        colorId: attrs.color.id,
        color: attrs.color.name,
        scentId: attrs.scent.id,
        scent: attrs.scent.name,
        sizeId: attrs.size.id,
        size: attrs.size.name
      }) || ""
    });
    try {
      await upsertOrder(order);
      dlg.close();
      const msg = state.editingId
        ? "Order updated"
        : qty > 1
          ? `Added ${qty} items`
          : "Order added";
      showToast(msg);
      state.editingId = null;
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  });
}
