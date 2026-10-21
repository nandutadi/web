import { openDialog } from "./order-form.js";
import { openCategoryDialog } from "./category-dialog.js";

export function bindShortcuts() {
  document.addEventListener("keydown", e => {
    const active = document.activeElement;
    const tag = active?.tagName || "";
    const inputType = (active?.type || "text").toLowerCase();
    const typing =
      tag === "TEXTAREA" ||
      (tag === "INPUT" && !["button", "submit", "checkbox", "radio", "file", "reset"].includes(inputType)) ||
      tag === "SELECT";
    const typingText =
      tag === "TEXTAREA" ||
      (tag === "INPUT" && !["button", "submit", "checkbox", "radio", "file", "reset"].includes(inputType));
    const orderOpen = !!document.getElementById("dlg")?.open;
    const catOpen = !!document.getElementById("catDlg")?.open;
    const viewOpen = !!document.getElementById("viewDlg")?.open;
    const anyDialogOpen = orderOpen || catOpen || viewOpen;

    if (e.key === "/" && !typing && !anyDialogOpen) {
      e.preventDefault();
      document.getElementById("search").focus();
    }
    if (
      e.key.toLowerCase() === "n" &&
      !e.metaKey && !e.ctrlKey && !e.altKey &&
      !typing && !anyDialogOpen
    ) {
      e.preventDefault();
      openDialog(null);
    }
    if (
      e.key.toLowerCase() === "c" &&
      !e.metaKey && !e.ctrlKey && !e.altKey &&
      !typing && !anyDialogOpen
    ) {
      e.preventDefault();
      openCategoryDialog();
    }
    if (
      e.key.toLowerCase() === "s" &&
      !e.altKey &&
      (orderOpen || catOpen) &&
      ((e.metaKey || e.ctrlKey) || !typingText)
    ) {
      e.preventDefault();
      const form = catOpen
        ? document.getElementById("catForm")
        : document.getElementById("form");
      form?.requestSubmit();
      return;
    }
    if (e.key === "Escape" && viewOpen) {
      document.getElementById("viewDlg").close();
      return;
    }
    if (e.key === "Escape" && catOpen) {
      document.getElementById("catDlg").close();
      return;
    }
    if (e.key === "Escape" && orderOpen) {
      document.getElementById("dlg").close();
    }
  });
}
