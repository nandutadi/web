import { state, requestRender } from "../app/state.js";
import { normalizeOrder } from "../domain/order.js";
import { upsertOrder } from "../data/orders-repository.js";
import { showToast } from "./toast.js";

export function bindImportExport() {
  document.getElementById("export").onclick = () => {
    const blob = new Blob([JSON.stringify(state.orders, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-orders.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Orders exported");
  };

  document.getElementById("import").onclick = () => document.getElementById("importFile").click();

  document.getElementById("importFile").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text());
      if (!Array.isArray(incoming)) throw new Error("Expected a JSON array");
      const existing = new Set(state.orders.map(o => o.id));
      let added = 0;
      for (const item of incoming) {
        if (!item?.person || !item?.kind) continue;
        const id = item.id && !existing.has(item.id) ? item.id : crypto.randomUUID();
        await upsertOrder(normalizeOrder({ ...item, id, createdAt: item.createdAt || Date.now() }, id));
        existing.add(id);
        added++;
      }
      if (!state.cloudEnabled) requestRender();
      showToast(`Imported ${added} order${added === 1 ? "" : "s"}`);
    } catch (err) {
      alert("Import failed: " + err.message);
    }
    e.target.value = "";
  });
}
