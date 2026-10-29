import { FIXED_TYPES } from "../core/constants.js";
import { findOpt, resinShapes, typeMeta } from "./catalog.js";

const MAX_QTY = 99;

export function normalizeKind(rawKind) {
  const k = String(rawKind || "candle");
  if (FIXED_TYPES.some(t => t.id === k)) return k;
  if (/resin/i.test(k)) return "resin";
  if (/pipe/i.test(k)) return "pipeCleaner";
  return "candle";
}

export function normalizeUnit(raw = {}) {
  return {
    id: raw.id || crypto.randomUUID(),
    completed: !!raw.completed,
    delivered: !!raw.delivered,
    paid: !!raw.paid
  };
}

/** Clamp quantity to a sensible cart size. */
export function clampQty(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_QTY, n);
}

/**
 * Build / resize the per-item status list.
 * Legacy orders (no units) become a single unit from top-level flags.
 */
export function normalizeUnits(raw) {
  if (Array.isArray(raw?.units) && raw.units.length) {
    const qty = raw.qty != null ? clampQty(raw.qty) : clampQty(raw.units.length);
    return resizeUnits(raw.units.map(normalizeUnit), qty);
  }
  const qty = clampQty(raw?.qty ?? 1);
  const seed = normalizeUnit({
    completed: raw?.completed,
    delivered: raw?.delivered,
    paid: raw?.paid
  });
  return resizeUnits([seed], qty);
}

export function resizeUnits(units, qty) {
  const n = clampQty(qty);
  const next = (Array.isArray(units) ? units : []).map(normalizeUnit);
  while (next.length < n) next.push(normalizeUnit());
  while (next.length > n) next.pop();
  return next;
}

function aggregateFlags(units) {
  if (!units.length) {
    return { completed: false, delivered: false, paid: false };
  }
  return {
    completed: units.every(u => u.completed),
    delivered: units.every(u => u.delivered),
    paid: units.every(u => u.paid)
  };
}

/** Parse a free-text catalog/order price into a number, or null. */
export function parseMoney(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/,/g, "").replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(value) {
  const n = parseMoney(value);
  if (n === null) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(n);
}

/** Unit price for a candle shape from the catalog. */
export function candleUnitPrice(catalog, shapeId, shapeName) {
  const shape =
    findOpt(catalog?.candle?.shapes, shapeId) ||
    findOpt(catalog?.candle?.shapes, shapeName);
  return parseMoney(shape?.price);
}

/** unitPrice × qty for candle orders; null when unknown. */
export function calcOrderAmount(unitPrice, qty) {
  const price = parseMoney(unitPrice);
  if (price === null) return null;
  return price * clampQty(qty);
}

/**
 * Fill missing candle pricing from the catalog (for orders created before prices existed).
 * Stored unitPrice/amount always win when present.
 */
export function resolveOrderPricing(order, catalog) {
  const o = order ? normalizeOrder(order, order.id) : null;
  if (!o) return null;
  if (normalizeKind(o.kind) !== "candle") return o;

  let unitPrice = parseMoney(o.unitPrice);
  let amount = parseMoney(o.amount);
  if (unitPrice !== null && amount !== null) return o;

  const fromCatalog = candleUnitPrice(catalog, o.shapeId, o.shape || o.candleType);
  if (unitPrice === null) unitPrice = fromCatalog;
  if (amount === null && unitPrice !== null) {
    amount = calcOrderAmount(unitPrice, o.qty);
  }
  if (unitPrice === null && amount === null) return o;
  return {
    ...o,
    unitPrice: unitPrice === null ? "" : unitPrice,
    amount: amount === null ? "" : amount
  };
}

/** Apply catalog prices to any candle orders that are missing amount/unitPrice. */
export function applyCatalogPricingToOrders(orders, catalog) {
  const changed = [];
  const next = (orders || []).map(order => {
    if (normalizeKind(order?.kind) !== "candle") return order;
    const hadAmount = parseMoney(order?.amount) !== null;
    const hadUnit = parseMoney(order?.unitPrice) !== null;
    if (hadAmount && hadUnit) return order;
    const resolved = resolveOrderPricing(order, catalog);
    if (
      parseMoney(resolved.amount) === parseMoney(order?.amount) &&
      parseMoney(resolved.unitPrice) === parseMoney(order?.unitPrice)
    ) {
      return order;
    }
    if (parseMoney(resolved.amount) === null && parseMoney(resolved.unitPrice) === null) {
      return order;
    }
    changed.push(resolved);
    return resolved;
  });
  return { orders: next, changed };
}

export function normalizeOrder(raw, id) {
  const kind = normalizeKind(raw.kind);
  const meta = typeMeta(kind);
  const units = normalizeUnits(raw);
  const flags = aggregateFlags(units);
  const qty = units.length;
  let unitPrice = parseMoney(raw.unitPrice);
  let amount = parseMoney(raw.amount);
  if (unitPrice === null && amount !== null && qty > 0) {
    unitPrice = amount / qty;
  }
  if (amount === null && unitPrice !== null) {
    amount = calcOrderAmount(unitPrice, qty);
  }
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
    units,
    qty,
    unitPrice: unitPrice === null ? "" : unitPrice,
    amount: amount === null ? "" : amount,
    completed: flags.completed,
    delivered: flags.delivered,
    paid: flags.paid,
    notes: raw.notes || "",
    image: raw.image || ""
  };
}

export function orderPayload(o) {
  const units = normalizeUnits(o);
  const flags = aggregateFlags(units);
  const unitPrice = parseMoney(o.unitPrice);
  const amount = parseMoney(o.amount) ?? calcOrderAmount(unitPrice, units.length);
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
    units,
    qty: units.length,
    unitPrice: unitPrice === null ? "" : unitPrice,
    amount: amount === null ? "" : amount,
    completed: flags.completed,
    delivered: flags.delivered,
    paid: flags.paid,
    notes: o.notes || "",
    image: o.image || ""
  };
}

export function isUnitDone(u) {
  return !!(u?.completed && u?.delivered && u?.paid);
}

export function isFullyDone(o) {
  const units = o?.units?.length ? o.units : null;
  if (units) return units.every(isUnitDone);
  return !!(o.completed && o.delivered && o.paid);
}

export function hasUnpaidUnit(o) {
  const units = o?.units?.length ? o.units : null;
  if (units) return units.some(u => !u.paid);
  return !o.paid;
}

export function hasIncompleteUnit(o) {
  const units = o?.units?.length ? o.units : null;
  if (units) return units.some(u => !u.completed);
  return !o?.completed;
}

export function unitCount(o) {
  if (o?.units?.length) return o.units.length;
  return clampQty(o?.qty ?? 1);
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
    if (statusFilter === "unpaid" && !hasUnpaidUnit(o)) return false;
    if (statusFilter === "incomplete" && !hasIncompleteUnit(o)) return false;
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

/** Count pieces (units) across orders — used by stats. */
export function countUnits(orders) {
  return (orders || []).reduce((sum, o) => sum + unitCount(o), 0);
}
