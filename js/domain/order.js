import { FIXED_TYPES } from "../core/constants.js";
import { findOpt, resinShapes, typeMeta } from "./catalog.js";

export function normalizeKind(rawKind) {
  const k = String(rawKind || "candle");
  if (FIXED_TYPES.some(t => t.id === k)) return k;
  if (/resin/i.test(k)) return "resin";
  if (/pipe/i.test(k)) return "pipeCleaner";
  return "candle";
}

export function normalizeOrder(raw, id) {
  const kind = normalizeKind(raw.kind);
  const meta = typeMeta(kind);
  return {
    id: id || raw.id || crypto.randomUUID(),
    createdAt: Number(raw.createdAt) || Date.now(),
    person: String(raw.person || ""),
    kind,
    kindName: raw.kindName || meta.name,
    shape: raw.shape || raw.candleType || "",
    shapeId: raw.shapeId || "",
    color: raw.color || "",
    colorId: raw.colorId || "",
    scent: raw.scent || "",
    scentId: raw.scentId || "",
    size: raw.size || "",
    sizeId: raw.sizeId || "",
    candleType: raw.candleType || raw.shape || "",
    resinText: raw.resinText || "",
    categoryPath: Array.isArray(raw.categoryPath) ? raw.categoryPath : [],
    completed: !!raw.completed,
    delivered: !!raw.delivered,
    paid: !!raw.paid,
    notes: raw.notes || "",
    image: raw.image || ""
  };
}

export function orderPayload(o) {
  return {
    createdAt: o.createdAt || Date.now(),
    person: o.person || "",
    kind: o.kind || "",
    kindName: o.kindName || "",
    shape: o.shape || "",
    shapeId: o.shapeId || "",
    color: o.color || "",
    colorId: o.colorId || "",
    scent: o.scent || "",
    scentId: o.scentId || "",
    size: o.size || "",
    sizeId: o.sizeId || "",
    candleType: o.candleType || o.shape || "",
    resinText: o.resinText || "",
    categoryPath: Array.isArray(o.categoryPath) ? o.categoryPath : [],
    completed: !!o.completed,
    delivered: !!o.delivered,
    paid: !!o.paid,
    notes: o.notes || "",
    image: o.image || ""
  };
}

export function isFullyDone(o) {
  return !!(o.completed && o.delivered && o.paid);
}

export function orderTitle(o) {
  const parts = [o.shape || o.candleType, o.size, o.color, o.scent]
    .map(x => x?.trim())
    .filter(Boolean);
  if (parts.length) return parts.join(" · ");
  if (Array.isArray(o.categoryPath) && o.categoryPath.length) {
    return o.categoryPath.map(p => p.name).join(" · ");
  }
  return o.kindName || typeMeta(o.kind).name;
}

export function orderSearchText(o) {
  return [
    o.person, o.kind, o.kindName, o.shape, o.candleType,
    o.size, o.color, o.scent, o.resinText, o.notes
  ].join(" ").toLowerCase();
}

export function orderOptionImage(catalog, kind, attrs) {
  const shapeName = attrs.shape || attrs.shapeName;
  const colorName = attrs.color || attrs.colorName;
  if (kind === "candle") {
    return findOpt(catalog.candle.shapes, attrs.shapeId || shapeName)?.image
      || findOpt(catalog.candle.colors, attrs.colorId || colorName)?.image
      || findOpt(catalog.candle.scents, attrs.scentId || attrs.scent)?.image
      || "";
  }
  if (kind === "resin") {
    const shapes = resinShapes(catalog);
    const shape = findOpt(shapes, attrs.shapeId || shapeName);
    const size = findOpt(shape?.sizes || [], attrs.sizeId || attrs.size);
    return size?.image
      || shape?.image
      || findOpt(catalog.resin.colors, attrs.colorId || colorName)?.image
      || "";
  }
  return findOpt(catalog.pipeCleaner.shapes, attrs.shapeId || shapeName)?.image
    || findOpt(catalog.pipeCleaner.sizes, attrs.sizeId || attrs.size)?.image
    || findOpt(catalog.pipeCleaner.colors, attrs.colorId || colorName)?.image
    || "";
}

export function filterOrders(orders, { query, person, typeFilter, statusFilter }) {
  const q = (query || "").trim().toLowerCase();
  return orders.filter(o => {
    if (person && (o.person || "") !== person) return false;
    if (typeFilter && o.kind !== typeFilter) return false;
    if (statusFilter === "open" && isFullyDone(o)) return false;
    if ((statusFilter === "closed" || statusFilter === "done") && !isFullyDone(o)) return false;
    if (statusFilter === "unpaid" && o.paid) return false;
    if (q && !orderSearchText(o).includes(q)) return false;
    return true;
  });
}

export function uniqueValues(orders, key) {
  return [...new Set(orders.map(o => (o[key] || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function attrsFromOrder(order) {
  if (!order) return {};
  return {
    shapeId: order.shapeId,
    shapeName: order.shape || order.candleType,
    colorId: order.colorId,
    colorName: order.color,
    scentId: order.scentId,
    scentName: order.scent,
    sizeId: order.sizeId,
    sizeName: order.size
  };
}
