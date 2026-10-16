import { state, requestRender } from "../app/state.js";

export function bindFilters() {
  document.getElementById("search").addEventListener("input", () => requestRender());
  document.getElementById("filterPerson").addEventListener("change", () => requestRender());

  document.getElementById("typeFilter").addEventListener("click", e => {
    const btn = e.target.closest("button[data-type]");
    if (!btn) return;
    state.typeFilter = btn.dataset.type;
    [...document.getElementById("typeFilter").children].forEach(b =>
      b.classList.toggle("on", b === btn)
    );
    requestRender();
  });

  document.getElementById("statusFilter").addEventListener("click", e => {
    const btn = e.target.closest("button[data-status]");
    if (!btn) return;
    state.statusFilter = btn.dataset.status;
    [...document.getElementById("statusFilter").children].forEach(b =>
      b.classList.toggle("on", b === btn)
    );
    requestRender();
  });
}
