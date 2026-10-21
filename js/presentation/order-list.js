import { esc } from "../core/escape.js";
import { filterOrders, isFullyDone, uniqueValues } from "../domain/order.js";
import { state } from "../app/state.js";
import { renderStats } from "./stats.js";
import { orderCard } from "./order-card.js";
import { openDialog } from "./order-form.js";

function getVisibleOrders() {
  return filterOrders(state.orders, {
    query: document.getElementById("search")?.value || "",
    person: document.getElementById("filterPerson")?.value || "",
    typeFilter: state.typeFilter,
    statusFilter: state.statusFilter
  });
}

export function render() {
  const visible = getVisibleOrders();
  renderStats(visible);
  document.getElementById("resultsCount").textContent =
    `${visible.length} ${visible.length === 1 ? "order" : "orders"}`;

  const groups = new Map();
  for (const o of visible) {
    const key = o.person?.trim() || "Unnamed";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }

  const list = document.getElementById("list");
  list.innerHTML = "";

  if (!visible.length) {
    const noOrders = state.orders.length === 0;
    list.innerHTML = `<div class="empty"><div class="empty-icon">${noOrders ? "✦" : "⌕"}</div><h3>${noOrders ? "Your first order starts here" : "No matching orders"}</h3><p>${noOrders ? "Add a customer order to start organizing your studio." : "Try changing your search or filters."}</p>${noOrders ? '<button class="btn btn-primary" type="button" id="emptyAdd">＋ Add your first order</button>' : ""}</div>`;
    const emptyAdd = document.getElementById("emptyAdd");
    if (emptyAdd) emptyAdd.onclick = () => openDialog(null);
  } else {
    for (const [name, items] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
      const isCollapsed = state.collapsedGroups.has(name);
      const section = document.createElement("section");
      section.className = "group" + (isCollapsed ? " collapsed" : "");
      const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase() || "?";
      const head = document.createElement("h2");
      head.className = "group-head";

      const titleBtn = document.createElement("button");
      titleBtn.type = "button";
      titleBtn.className = "group-title";
      titleBtn.title = isCollapsed ? `Expand orders for ${name}` : `Collapse orders for ${name}`;
      titleBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      titleBtn.setAttribute("aria-label", `${isCollapsed ? "Expand" : "Collapse"} orders for ${name}`);

      const chevron = document.createElement("span");
      chevron.className = "group-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▾";
      const avatar = document.createElement("span");
      avatar.className = "person-avatar";
      avatar.textContent = initials;
      const groupName = document.createElement("span");
      groupName.className = "group-name";
      groupName.textContent = name;
      titleBtn.append(chevron, avatar, groupName);
      titleBtn.onclick = () => {
        if (state.collapsedGroups.has(name)) state.collapsedGroups.delete(name);
        else state.collapsedGroups.add(name);
        section.classList.toggle("collapsed", state.collapsedGroups.has(name));
        const collapsed = state.collapsedGroups.has(name);
        titleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
        titleBtn.title = collapsed ? `Expand orders for ${name}` : `Collapse orders for ${name}`;
        titleBtn.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} orders for ${name}`);
      };

      const count = document.createElement("span");
      count.className = "group-count";
      count.textContent = String(items.length);
      const line = document.createElement("span");
      line.className = "group-line";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "group-add";
      addBtn.textContent = "＋";
      addBtn.title = `Add order for ${name}`;
      addBtn.setAttribute("aria-label", `Add order for ${name}`);
      addBtn.onclick = () => openDialog({ person: name });
      head.append(titleBtn, count, line, addBtn);
      section.appendChild(head);

      const wrap = document.createElement("div");
      wrap.className = "order-list";
      items
        .sort((a, b) => Number(isFullyDone(a)) - Number(isFullyDone(b)) || (b.createdAt || 0) - (a.createdAt || 0))
        .forEach(o => wrap.appendChild(orderCard(o)));
      section.appendChild(wrap);
      list.appendChild(section);
    }
  }

  const people = uniqueValues(state.orders, "person");
  const filter = document.getElementById("filterPerson");
  const current = filter.value;
  filter.innerHTML =
    `<option value="">All customers</option>` +
    people.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
  filter.value = people.includes(current) ? current : "";
  document.getElementById("people").innerHTML = people.map(p => `<option value="${esc(p)}">`).join("");
}
