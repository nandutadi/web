import { FIXED_TYPES } from "../core/constants.js";

export function newOpt(name = "", extra = {}) {
  return { id: crypto.randomUUID(), name, image: "", ...extra };
}

export function optionList(names) {
  return names.map(n => newOpt(n));
}

export function defaultCatalog() {
  return {
    version: 2,
    candle: {
      shapes: optionList([
        "Teddy Bear", "Closed rose", "Open rose", "Sea shell",
        "Jasmine set", "Couple", "Mothichoor laddo", "Sunflower"
      ]),
      colors: optionList([
        "Pink", "Orange", "Blue", "Red", "Violet",
        "Yellow", "Green", "Mustard", "Burgundy"
      ]),
      scents: optionList(["Sea Breeze", "Strawberry", "Intimate"])
    },
    resin: {
      useCandleShapes: false,
      shapes: [],
      colors: []
    },
    pipeCleaner: {
      shapes: [],
      sizes: [],
      colors: []
    }
  };
}

export function normalizeOpt(raw, withSizes = false) {
  const opt = {
    id: raw?.id || crypto.randomUUID(),
    name: String(raw?.name || "").trim(),
    image: raw?.image || "",
    expanded: !!raw?.expanded
  };
  if (withSizes) {
    opt.sizes = Array.isArray(raw?.sizes)
      ? raw.sizes.map(s => normalizeOpt(s, false)).filter(s => s.name)
      : Array.isArray(raw?.children)
        ? raw.children.map(s => normalizeOpt(s, false)).filter(s => s.name)
        : [];
  }
  return opt;
}

export function normalizeOptList(list, withSizes = false) {
  return (Array.isArray(list) ? list : [])
    .map(item => normalizeOpt(item, withSizes))
    .filter(o => o.name);
}

export function normalizeCatalog(raw) {
  const base = defaultCatalog();
  if (!raw || typeof raw !== "object") return base;
  // Migrate old array tree format
  if (Array.isArray(raw)) {
    const candle = raw.find(t => t.id === "candle" || /candle/i.test(t.name || ""));
    const resin = raw.find(t => t.id === "resin" || /resin/i.test(t.name || ""));
    if (candle?.children?.length) base.candle.shapes = normalizeOptList(candle.children);
    if (resin?.children?.length) base.resin.shapes = normalizeOptList(resin.children, true);
    return base;
  }
  return {
    version: 2,
    candle: {
      shapes: normalizeOptList(raw.candle?.shapes),
      colors: normalizeOptList(raw.candle?.colors),
      scents: normalizeOptList(raw.candle?.scents)
    },
    resin: {
      useCandleShapes: !!raw.resin?.useCandleShapes,
      shapes: normalizeOptList(raw.resin?.shapes, true),
      colors: normalizeOptList(raw.resin?.colors)
    },
    pipeCleaner: {
      shapes: normalizeOptList(raw.pipeCleaner?.shapes),
      sizes: normalizeOptList(raw.pipeCleaner?.sizes),
      colors: normalizeOptList(raw.pipeCleaner?.colors)
    }
  };
}

export function pruneOptList(list, withSizes = false) {
  return (list || [])
    .map(o => {
      const next = {
        id: o.id || crypto.randomUUID(),
        name: (o.name || "").trim(),
        image: o.image || ""
      };
      if (withSizes) next.sizes = pruneOptList(o.sizes || [], false);
      return next;
    })
    .filter(o => o.name);
}

export function cleanCatalog(raw) {
  const c = normalizeCatalog(raw);
  return {
    version: 2,
    candle: {
      shapes: pruneOptList(c.candle.shapes),
      colors: pruneOptList(c.candle.colors),
      scents: pruneOptList(c.candle.scents)
    },
    resin: {
      useCandleShapes: !!c.resin.useCandleShapes,
      shapes: pruneOptList(c.resin.shapes, true),
      colors: pruneOptList(c.resin.colors)
    },
    pipeCleaner: {
      shapes: pruneOptList(c.pipeCleaner.shapes),
      sizes: pruneOptList(c.pipeCleaner.sizes),
      colors: pruneOptList(c.pipeCleaner.colors)
    }
  };
}

export function typeMeta(id) {
  return FIXED_TYPES.find(t => t.id === id) || FIXED_TYPES[0];
}

export function cloneCatalog(data) {
  return JSON.parse(JSON.stringify(normalizeCatalog(data)));
}

export function findOpt(list, idOrName) {
  if (!idOrName) return null;
  return (list || []).find(o => o.id === idOrName || o.name === idOrName) || null;
}

export function resinShapes(catalog) {
  if (catalog?.resin?.useCandleShapes) return catalog.candle.shapes || [];
  return catalog?.resin?.shapes || [];
}

export function categoriesPayload(data) {
  return { catalog: cleanCatalog(data), updatedAt: Date.now() };
}
