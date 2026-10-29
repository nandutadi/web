import { FIXED_TYPES } from "../core/constants.js";
import { esc } from "../core/escape.js";
import { formatOrderedAt, formatOrderDay, orderDayKey } from "../core/dates.js";
import { typeMeta } from "../domain/catalog.js";
import {
  accountsSummary,
  formatMoney,
  orderTitle,
  uniqueValues,
  unitCount
} from "../domain/order.js";
import { state } from "../app/state.js";
import { openViewDialog } from "./view-dialog.js";

/** Collapsed same-day customer groups — clubs are expanded by default. */
const collapsedAccountGroups = new Set();

function kindClass(kind) {
  if (kind === "resin") return "resin";
  if (kind === "pipeCleaner") return "pipe";
  return "candle";
}

function orderUnits(order) {
  if (order?.units?.length) return order.units;
  return [{
    completed: !!order?.completed,
    delivered: !!order?.delivered,
    paid: !!order?.paid
  }];
}

function deliveryInfo(order) {
  const units = orderUnits(order);
  const qty = unitCount(order);
  const deliveredCount = units.filter(u => u.delivered).length;
  if (deliveredCount >= qty && qty > 0) {
    return { label: "Delivered", cls: "delivered", deliveredCount, qty };
  }
  if (deliveredCount <= 0) {
    return { label: "Not delivered", cls: "undelivered", deliveredCount, qty };
  }
  return {
    label: `Partial · ${deliveredCount}/${qty}`,
    cls: "partial-delivery",
    deliveredCount,
    qty
  };
}

function paymentLabel(row) {
  if (row.amount === null) return "No price";
  if (row.outstanding <= 0.0001) return "Paid";
  if (row.received <= 0.0001) return "Unpaid";
  return `Partial · ${row.paidCount}/${row.qty}`;
}

function paymentClass(row) {
  if (row.amount === null) return "none";
  if (row.outstanding <= 0.0001) return "paid";
  if (row.received <= 0.0001) return "unpaid";
  return "partial";
}

function readAccountsFilters() {
  return {
    query: document.getElementById("accountsSearch")?.value || "",
    person: document.getElementById("accountsPerson")?.value || "",
    typeFilter: document.getElementById("accountsTypeFilter")?.querySelector(".on")?.dataset?.type || "",
    payFilter: document.getElementById("accountsPayFilter")?.querySelector(".on")?.dataset?.pay || "",
    deliveryFilter: document.getElementById("accountsDeliveryFilter")?.querySelector(".on")?.dataset?.delivery || ""
  };
}

function filteredRows(summary) {
  const { query, person, typeFilter, payFilter, deliveryFilter } = readAccountsFilters();
  const q = query.trim().toLowerCase();
  return summary.rows.filter(row => {
    const o = row.order;
    const delivery = deliveryInfo(o);
    if (person && (o.person || "") !== person) return false;
    if (typeFilter && o.kind !== typeFilter) return false;
    if (payFilter === "paid" && !(row.amount !== null && row.outstanding <= 0.0001)) return false;
    if (payFilter === "unpaid" && !(row.amount !== null && row.outstanding > 0.0001)) return false;
    if (payFilter === "none" && row.amount !== null) return false;
    if (deliveryFilter === "delivered" && delivery.cls !== "delivered") return false;
    if (deliveryFilter === "undelivered" && delivery.cls === "delivered") return false;
    if (q) {
      const hay = [
        o.person, o.kindName, o.shape, o.candleType, o.color, o.scent, o.size, o.notes,
        delivery.label,
        row.amount === null ? "" : formatMoney(row.amount)
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function sumRows(rows) {
  return rows.reduce(
    (acc, row) => {
      if (row.amount === null) return acc;
      acc.total += row.amount;
      acc.received += row.received;
      acc.outstanding += row.outstanding;
      return acc;
    },
    { total: 0, received: 0, outstanding: 0 }
  );
}

/** Club filtered lines by customer + calendar day. */
function clubRowsByCustomerDay(rows) {
  const map = new Map();
  for (const row of rows) {
    const person = (row.order.person || "").trim() || "Unnamed";
    const day = orderDayKey(row.order.createdAt);
    const key = `${person.toLowerCase()}|${day}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        person,
        day,
        createdAt: row.order.createdAt || 0,
        rows: []
      });
    }
    const group = map.get(key);
    group.rows.push(row);
    if ((row.order.createdAt || 0) > group.createdAt) {
      group.createdAt = row.order.createdAt || 0;
    }
  }

  return [...map.values()].map(group => {
    let total = 0;
    let received = 0;
    let outstanding = 0;
    let priced = 0;
    let deliveredAll = true;
    let deliveredNone = true;
    let paidAll = true;
    let paidNone = true;
    const titles = [];
    const kinds = new Set();

    for (const row of group.rows) {
      const o = row.order;
      titles.push(orderTitle(o));
      kinds.add(o.kindName || typeMeta(o.kind).name);
      const delivery = deliveryInfo(o);
      if (delivery.cls !== "delivered") deliveredAll = false;
      if (delivery.deliveredCount > 0) deliveredNone = false;

      if (row.amount === null) {
        paidAll = false;
        continue;
      }
      priced += 1;
      total += row.amount;
      received += row.received;
      outstanding += row.outstanding;
      if (row.outstanding > 0.0001) paidAll = false;
      if (row.received > 0.0001) paidNone = false;
    }

    let deliveryCls = "partial-delivery";
    let deliveryLabel = "Partial delivery";
    if (deliveredAll) {
      deliveryCls = "delivered";
      deliveryLabel = "Delivered";
    } else if (deliveredNone) {
      deliveryCls = "undelivered";
      deliveryLabel = "Not delivered";
    }

    let payCls = "partial";
    let payLabel = "Partial";
    if (priced === 0) {
      payCls = "none";
      payLabel = "No price";
    } else if (paidAll) {
      payCls = "paid";
      payLabel = "Paid";
    } else if (paidNone) {
      payCls = "unpaid";
      payLabel = "Unpaid";
    }

    return {
      ...group,
      total: priced ? total : null,
      received,
      outstanding,
      priced,
      titles,
      kinds: [...kinds],
      deliveryCls,
      deliveryLabel,
      payCls,
      payLabel,
      isClub: group.rows.length > 1
    };
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function renderPersonFilter(people) {
  const el = document.getElementById("accountsPerson");
  if (!el) return;
  const current = el.value;
  el.innerHTML =
    `<option value="">All people</option>` +
    people.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
  if (people.includes(current)) el.value = current;
}

function renderTypeFilter() {
  const host = document.getElementById("accountsTypeFilter");
  if (!host || host.dataset.bound) return;
  host.innerHTML =
    `<button type="button" data-type="" class="on">All</button>` +
    FIXED_TYPES.map(
      t => `<button type="button" data-type="${esc(t.id)}">${esc(t.name)}</button>`
    ).join("");
  host.dataset.bound = "1";
  host.addEventListener("click", e => {
    const btn = e.target.closest("button[data-type]");
    if (!btn) return;
    host.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === btn));
    renderAccounts();
  });
}

function renderPayFilter() {
  const host = document.getElementById("accountsPayFilter");
  if (!host || host.dataset.bound) return;
  host.innerHTML = `
    <button type="button" data-pay="" class="on">All</button>
    <button type="button" data-pay="paid">Paid</button>
    <button type="button" data-pay="unpaid">Outstanding</button>
    <button type="button" data-pay="none">No price</button>
  `;
  host.dataset.bound = "1";
  host.addEventListener("click", e => {
    const btn = e.target.closest("button[data-pay]");
    if (!btn) return;
    host.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === btn));
    renderAccounts();
  });
}

function renderDeliveryFilter() {
  const host = document.getElementById("accountsDeliveryFilter");
  if (!host || host.dataset.bound) return;
  host.innerHTML = `
    <button type="button" data-delivery="" class="on">All delivery</button>
    <button type="button" data-delivery="delivered">Delivered</button>
    <button type="button" data-delivery="undelivered">Not delivered</button>
  `;
  host.dataset.bound = "1";
  host.addEventListener("click", e => {
    const btn = e.target.closest("button[data-delivery]");
    if (!btn) return;
    host.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === btn));
    renderAccounts();
  });
}

function openOrderById(id) {
  const order = state.orders.find(o => o.id === id);
  if (order) openViewDialog(order);
}

function isGroupExpanded(key) {
  return !collapsedAccountGroups.has(key);
}

function toggleGroup(key) {
  if (collapsedAccountGroups.has(key)) collapsedAccountGroups.delete(key);
  else collapsedAccountGroups.add(key);
  renderAccounts();
}

function bindAccountsListClicks() {
  const list = document.getElementById("accountsList");
  if (!list || list.dataset.boundClicks) return;
  list.dataset.boundClicks = "1";

  list.addEventListener("click", e => {
    if (e.target.closest("button, label, input, a, select")) return;
    const child = e.target.closest("[data-order-id]");
    if (child) {
      openOrderById(child.dataset.orderId);
      return;
    }
    const group = e.target.closest("[data-group-key]");
    if (!group) return;
    if (group.dataset.singleOrderId) {
      openOrderById(group.dataset.singleOrderId);
      return;
    }
    toggleGroup(group.dataset.groupKey);
  });

  list.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const child = e.target.closest("[data-order-id]");
    if (child && e.target === child) {
      e.preventDefault();
      openOrderById(child.dataset.orderId);
      return;
    }
    const group = e.target.closest("[data-group-key]");
    if (!group || e.target !== group) return;
    e.preventDefault();
    if (group.dataset.singleOrderId) {
      openOrderById(group.dataset.singleOrderId);
      return;
    }
    toggleGroup(group.dataset.groupKey);
  });
}

export function bindAccountsFilters() {
  renderTypeFilter();
  renderPayFilter();
  renderDeliveryFilter();
  bindAccountsListClicks();
  document.getElementById("accountsSearch")?.addEventListener("input", () => renderAccounts());
  document.getElementById("accountsPerson")?.addEventListener("change", () => renderAccounts());
}

function renderChildRow(row) {
  const o = row.order;
  const cls = kindClass(o.kind);
  const delivery = deliveryInfo(o);
  const amountText = row.amount === null ? "—" : formatMoney(row.amount);
  return `
    <article class="accounts-row accounts-child accounts-row-clickable" role="button" tabindex="0"
      data-order-id="${esc(o.id)}"
      aria-label="View order ${esc(orderTitle(o))} for ${esc(o.person || "Unnamed")}">
      <div role="cell">
        <div class="accounts-meta"><span class="order-kind ${esc(cls)}">${esc(o.kindName || typeMeta(o.kind).name)}</span></div>
      </div>
      <div role="cell">
        <div class="accounts-title">${esc(orderTitle(o))}</div>
        <div class="accounts-meta">${esc(formatOrderedAt(o.createdAt))}</div>
      </div>
      <div role="cell" class="accounts-meta">Line amount</div>
      <div role="cell" class="accounts-status">
        <span class="status-pill ${delivery.cls}">${esc(delivery.label)}</span>
        <span class="pay-pill ${paymentClass(row)}">${esc(paymentLabel(row))}</span>
      </div>
      <div role="cell" class="num accounts-amount">${esc(amountText)}</div>
    </article>`;
}

function renderClubGroup(group) {
  const expanded = isGroupExpanded(group.key);
  const count = group.rows.length;
  const amountText = group.total === null ? "—" : formatMoney(group.total);
  const titlePreview = group.titles.slice(0, 2).join(" · ");
  const more = count > 2 ? ` +${count - 2} more` : "";
  const moneyMeta = group.total === null
    ? "No prices set"
    : group.received > 0 && group.outstanding > 0.0001
      ? `Received ${formatMoney(group.received)} · Due ${formatMoney(group.outstanding)}`
      : `${count} orders clubbed · ${group.kinds.join(" · ")}`;

  if (!group.isClub) {
    const row = group.rows[0];
    const o = row.order;
    const cls = kindClass(o.kind);
    const delivery = deliveryInfo(o);
    const lineAmount = row.amount === null ? "—" : formatMoney(row.amount);
    const detail = row.amount === null
      ? "No price set"
      : row.qty > 1 && row.received > 0 && row.outstanding > 0.0001
        ? `Received ${formatMoney(row.received)} · Due ${formatMoney(row.outstanding)}`
        : typeMeta(o.kind).name;
    return `
      <article class="accounts-row accounts-row-clickable" role="button" tabindex="0"
        data-group-key="${esc(group.key)}"
        data-single-order-id="${esc(o.id)}"
        aria-label="View order for ${esc(group.person)}">
        <div role="cell">
          <div class="accounts-person">${esc(group.person)}</div>
          <div class="accounts-meta"><span class="order-kind ${esc(cls)}">${esc(o.kindName || typeMeta(o.kind).name)}</span></div>
        </div>
        <div role="cell">
          <div class="accounts-title">${esc(orderTitle(o))}</div>
          <div class="accounts-meta">${esc(detail)}</div>
        </div>
        <div role="cell" class="accounts-meta">${esc(formatOrderDay(o.createdAt))}</div>
        <div role="cell" class="accounts-status">
          <span class="status-pill ${delivery.cls}">${esc(delivery.label)}</span>
          <span class="pay-pill ${paymentClass(row)}">${esc(paymentLabel(row))}</span>
        </div>
        <div role="cell" class="num accounts-amount">${esc(lineAmount)}</div>
      </article>`;
  }

  return `
    <div class="accounts-club${expanded ? " open" : ""}">
      <article class="accounts-row accounts-row-clickable accounts-club-head" role="button" tabindex="0"
        data-group-key="${esc(group.key)}"
        aria-expanded="${expanded ? "true" : "false"}"
        aria-label="${esc(group.person)} · ${count} orders on ${esc(formatOrderDay(group.createdAt))} · ${expanded ? "collapse" : "expand"}">
        <div role="cell">
          <div class="accounts-person">${esc(group.person)}</div>
          <div class="accounts-meta">
            <span class="club-badge">${count} orders</span>
          </div>
        </div>
        <div role="cell">
          <div class="accounts-title">${esc(titlePreview)}${esc(more)}</div>
          <div class="accounts-meta">${esc(moneyMeta)}</div>
        </div>
        <div role="cell" class="accounts-meta">
          ${esc(formatOrderDay(group.createdAt))}
          <div class="accounts-meta">${expanded ? "Click to collapse" : "Click to expand"}</div>
        </div>
        <div role="cell" class="accounts-status">
          <span class="status-pill ${group.deliveryCls}">${esc(group.deliveryLabel)}</span>
          <span class="pay-pill ${group.payCls}">${esc(group.payLabel)}</span>
        </div>
        <div role="cell" class="num">
          <div class="accounts-amount">${esc(amountText)}</div>
          <div class="accounts-meta">Consolidated</div>
        </div>
      </article>
      ${expanded ? `<div class="accounts-club-body">${group.rows.map(renderChildRow).join("")}</div>` : ""}
    </div>`;
}

export function renderAccounts() {
  const summary = accountsSummary(state.orders, state.catalog);
  renderPersonFilter(uniqueValues(state.orders, "person"));
  renderTypeFilter();
  renderPayFilter();
  renderDeliveryFilter();

  const rows = filteredRows(summary);
  const groups = clubRowsByCustomerDay(rows);
  const totals = sumRows(rows);
  const deliveredTotal = rows.reduce((sum, row) => {
    if (row.amount === null) return sum;
    return deliveryInfo(row.order).cls === "delivered" ? sum + row.amount : sum;
  }, 0);
  const undeliveredTotal = rows.reduce((sum, row) => {
    if (row.amount === null) return sum;
    return deliveryInfo(row.order).cls !== "delivered" ? sum + row.amount : sum;
  }, 0);
  const countEl = document.getElementById("accountsCount");
  if (countEl) {
    const clubbed = groups.filter(g => g.isClub).length;
    countEl.textContent = clubbed
      ? `${groups.length} groups · ${rows.length} lines`
      : `${rows.length} line${rows.length === 1 ? "" : "s"}`;
  }

  const stats = document.getElementById("accountsStats");
  if (stats) {
    const candle = summary.byKind.candle?.total || 0;
    const resin = summary.byKind.resin?.total || 0;
    stats.innerHTML = `
      <article class="stat">
        <div class="stat-head"><span class="stat-label">Total billed</span><span class="stat-icon">₹</span></div>
        <div class="stat-value money">${esc(formatMoney(totals.total) || "₹0")}</div>
        <div class="stat-sub">${groups.length} customer-day groups · ${summary.pricedCount} priced</div>
      </article>
      <article class="stat closed">
        <div class="stat-head"><span class="stat-label">Received</span><span class="stat-icon">✓</span></div>
        <div class="stat-value money">${esc(formatMoney(totals.received) || "₹0")}</div>
        <div class="stat-sub">Marked paid on order units</div>
      </article>
      <article class="stat unpaid">
        <div class="stat-head"><span class="stat-label">Outstanding</span><span class="stat-icon">◷</span></div>
        <div class="stat-value money">${esc(formatMoney(totals.outstanding) || "₹0")}</div>
        <div class="stat-sub">Still to collect</div>
      </article>
      <article class="stat open">
        <div class="stat-head"><span class="stat-label">Delivered</span><span class="stat-icon">▦</span></div>
        <div class="stat-value money">${esc(formatMoney(deliveredTotal) || "₹0")}</div>
        <div class="stat-sub">Fully delivered lines</div>
      </article>
      <article class="stat warn">
        <div class="stat-head"><span class="stat-label">Not delivered</span><span class="stat-icon">◌</span></div>
        <div class="stat-value money">${esc(formatMoney(undeliveredTotal) || "₹0")}</div>
        <div class="stat-sub">Pending or partial delivery</div>
      </article>
      <article class="stat candles">
        <div class="stat-head"><span class="stat-label">Candles</span><span class="stat-icon">♨</span></div>
        <div class="stat-value money">${esc(formatMoney(candle) || "₹0")}</div>
        <div class="stat-sub">All candle orders</div>
      </article>
      <article class="stat resin">
        <div class="stat-head"><span class="stat-label">Resin</span><span class="stat-icon">✧</span></div>
        <div class="stat-value money">${esc(formatMoney(resin) || "₹0")}</div>
        <div class="stat-sub">All resin orders</div>
      </article>
    `;
  }

  const list = document.getElementById("accountsList");
  if (!list) return;

  if (!rows.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">₹</div>
        <h3>No amounts to show</h3>
        <p>Add prices on candle shapes or enter resin prices on orders.</p>
      </div>`;
    return;
  }

  list.innerHTML = `
    <div class="accounts-table" role="table" aria-label="Order amounts">
      <div class="accounts-row accounts-head" role="row">
        <div role="columnheader">Customer</div>
        <div role="columnheader">Order</div>
        <div role="columnheader">Date</div>
        <div role="columnheader">Status</div>
        <div role="columnheader" class="num">Amount</div>
      </div>
      ${groups.map(renderClubGroup).join("")}
    </div>`;
}
