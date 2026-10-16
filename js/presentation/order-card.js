import { CANDLE_COLOR_HEX, SHAPE_ICONS, KIND_ICONS } from "../core/constants.js";
import { typeMeta } from "../domain/catalog.js";
import { isFullyDone, orderTitle, orderOptionImage } from "../domain/order.js";
import { state } from "../app/state.js";
import { makeCheck } from "./checks.js";
import { openViewDialog } from "./view-dialog.js";

export function orderCard(o) {
  const el = document.createElement("article");
  el.className = "order" + (isFullyDone(o) ? " done" : "");
  const colorHint = o.color || "";
  const candleHex = CANDLE_COLOR_HEX[colorHint] || null;
  if (candleHex) {
    el.classList.add("tinted");
    el.style.setProperty("--tile-color", candleHex);
  }
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `View order: ${orderTitle(o)}`);
  el.addEventListener("click", e => {
    if (e.target.closest("button, label, input, a")) return;
    openViewDialog(o);
  });
  el.addEventListener("keydown", e => {
    if (e.target !== el) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openViewDialog(o);
    }
  });

  const top = document.createElement("div");
  top.className = "order-top";
  const icon = document.createElement("div");
  const kindClass = o.kind === "resin" ? "resin" : o.kind === "pipeCleaner" ? "pipe" : "candle";
  icon.className = "kind-icon " + kindClass;
  icon.setAttribute("aria-hidden", "true");
  const catImage = o.image || orderOptionImage(state.catalog, o.kind, o);
  if (catImage) {
    icon.classList.add("has-image");
    const img = document.createElement("img");
    img.src = catImage;
    img.alt = "";
    img.loading = "lazy";
    icon.appendChild(img);
  } else {
    const shapeName = o.shape || o.candleType;
    icon.textContent = SHAPE_ICONS[shapeName] || KIND_ICONS[o.kind] || "✦";
  }

  const content = document.createElement("div");
  content.className = "order-content";
  const title = document.createElement("div");
  title.className = "order-title";
  title.textContent = orderTitle(o);
  content.appendChild(title);

  const bits = [];
  if (o.shape?.trim() || o.candleType?.trim()) bits.push((o.shape || o.candleType).trim());
  if (o.size?.trim()) bits.push("Size: " + o.size.trim());
  if (o.color?.trim()) bits.push("Color: " + o.color.trim());
  if (o.scent?.trim()) bits.push("Scent: " + o.scent.trim());
  if (bits.length) {
    const meta = document.createElement("div");
    meta.className = "order-meta";
    meta.textContent = bits.join(" · ");
    content.appendChild(meta);
  }
  if (o.notes?.trim()) {
    const notes = document.createElement("div");
    notes.className = "order-meta";
    notes.textContent = "Note: " + o.notes.trim();
    content.appendChild(notes);
  }
  const kind = document.createElement("span");
  kind.className = "order-kind " + kindClass;
  kind.textContent = o.kindName || typeMeta(o.kind).name;
  content.appendChild(kind);
  top.append(icon, content);

  const divider = document.createElement("div");
  divider.className = "order-divider";
  const checks = document.createElement("div");
  checks.className = "checks";
  checks.append(
    makeCheck(o, "completed", "Completed"),
    makeCheck(o, "delivered", "Delivered"),
    makeCheck(o, "paid", "Payment Received", true)
  );
  el.append(top, divider, checks);
  return el;
}
