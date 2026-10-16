import { state } from "../app/state.js";
import { upsertOrder } from "../data/orders-repository.js";
import { showToast } from "./toast.js";

export function makeCheck(o, key, label, paid = false) {
  const lab = document.createElement("label");
  lab.className = "check" + (paid ? " paid" : "") + (o[key] ? " on" : "");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!o[key];
  input.setAttribute("aria-label", label + " for " + (o.person || "order"));
  input.addEventListener("change", async () => {
    const next = { ...o, [key]: input.checked };
    try {
      await upsertOrder(next);
      o[key] = input.checked;
      lab.classList.toggle("on", input.checked);
      if (state.viewingOrder?.id === o.id) state.viewingOrder[key] = input.checked;
      showToast(label + (input.checked ? " marked" : " unmarked"));
    } catch (err) {
      input.checked = !input.checked;
      alert("Update failed: " + err.message);
    }
  });
  lab.append(input, document.createTextNode(label));
  return lab;
}
