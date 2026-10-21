import { FIXED_TYPES } from "../core/constants.js";
import { esc } from "../core/escape.js";
import { readImageFile } from "../core/images.js";
import { newOpt, cloneCatalog } from "../domain/catalog.js";
import { state } from "../app/state.js";
import { persistCategories } from "../data/catalog-repository.js";
import { showToast } from "./toast.js";

function ensureTrailingPlaceholder(list, withSizes = false) {
  if (!list.length || (list[list.length - 1].name || "").trim()) {
    const row = newOpt("");
    row.placeholder = true;
    if (withSizes) row.sizes = [];
    list.push(row);
  }
}

function filledOptCount(list) {
  return (list || []).filter(o => (o.name || "").trim()).length;
}

function pickCatImage(target) {
  const catImageFile = document.getElementById("catImageFile");
  state.catImageTarget = target;
  catImageFile.value = "";
  catImageFile.click();
}

function renderOptPoll(list, container, {
  withSizes = false,
  sizeLabel = "Sizes",
  placeholder = "Add option…",
  shapeImages = false
} = {}) {
  container.innerHTML = "";
  ensureTrailingPlaceholder(list, withSizes);
  list.forEach((node, index) => {
    const row = document.createElement("div");
    row.className = "cat-row"
      + (withSizes ? "" : " simple")
      + (shapeImages ? " shape-row" : "");

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "cat-thumb-wrap" + (node.image ? " has-image" : "");
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "cat-thumb" + (node.image ? " has-image" : "");
    thumb.title = node.image ? "Change image" : (shapeImages ? "Upload shape image" : "Upload image");
    thumb.setAttribute("aria-label", thumb.title);
    if (node.image) {
      const img = document.createElement("img");
      img.src = node.image;
      img.alt = "";
      thumb.appendChild(img);
    } else {
      thumb.textContent = shapeImages ? "IMG" : "＋";
    }
    const pollOpts = { withSizes, sizeLabel, placeholder, shapeImages };
    thumb.onclick = () => pickCatImage({ node, list, container, ...pollOpts });
    thumbWrap.appendChild(thumb);
    if (node.image) {
      const delImg = document.createElement("button");
      delImg.type = "button";
      delImg.className = "cat-thumb-del";
      delImg.title = "Remove image";
      delImg.setAttribute("aria-label", "Remove image");
      delImg.textContent = "✕";
      delImg.onclick = ev => {
        ev.preventDefault();
        ev.stopPropagation();
        node.image = "";
        renderOptPoll(list, container, pollOpts);
      };
      thumbWrap.appendChild(delImg);
    }

    const input = document.createElement("input");
    input.type = "text";
    input.value = node.name || "";
    input.placeholder = index === list.length - 1 ? placeholder : "Name";
    input.autocomplete = "off";

    let nestBtn = null;
    if (withSizes) {
      nestBtn = document.createElement("button");
      nestBtn.type = "button";
      nestBtn.className = "btn btn-icon";
      nestBtn.title = sizeLabel;
      nestBtn.textContent = node.expanded ? "▾" : "▸";
      nestBtn.disabled = !(node.name || "").trim();
      nestBtn.onclick = () => {
        if (!(node.name || "").trim()) return;
        node.expanded = !node.expanded;
        if (!Array.isArray(node.sizes)) node.sizes = [];
        renderOptPoll(list, container, pollOpts);
      };
    }

    input.addEventListener("input", () => {
      node.name = input.value;
      node.placeholder = false;
      if (nestBtn) nestBtn.disabled = !(node.name || "").trim();
      const isLast = index === list.length - 1;
      if (isLast && input.value.trim()) {
        ensureTrailingPlaceholder(list, withSizes);
        renderOptPoll(list, container, pollOpts);
        const rows = [...container.children].filter(el => el.classList.contains("cat-row"));
        const focusInput = rows[index]?.querySelector("input[type='text']");
        if (focusInput) {
          focusInput.focus();
          const len = focusInput.value.length;
          focusInput.setSelectionRange(len, len);
        }
      }
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "mini-btn delete";
    delBtn.title = "Remove";
    delBtn.textContent = "✕";
    delBtn.onclick = () => {
      if (!(node.name || "").trim() && index === list.length - 1) return;
      list.splice(index, 1);
      renderOptPoll(list, container, pollOpts);
    };

    if (withSizes) row.append(thumbWrap, input, nestBtn, delBtn);
    else row.append(thumbWrap, input, delBtn);
    container.appendChild(row);

    if (withSizes && node.expanded && (node.name || "").trim()) {
      if (!Array.isArray(node.sizes)) node.sizes = [];
      const nest = document.createElement("div");
      nest.className = "cat-nest";
      const nestHead = document.createElement("div");
      nestHead.className = "field-label";
      nestHead.style.marginBottom = "6px";
      nestHead.textContent = sizeLabel + " for " + node.name;
      nest.appendChild(nestHead);
      const nestPoll = document.createElement("div");
      nestPoll.className = "cat-poll";
      renderOptPoll(node.sizes, nestPoll, { withSizes: false, placeholder: "Add size / dimension…" });
      nest.appendChild(nestPoll);
      container.appendChild(nest);
    }
  });
}

function makeCatSection(title, hint, list, {
  withSizes = false,
  sizeLabel = "Sizes / dimensions",
  shapeImages = false,
  openByDefault = false
} = {}) {
  const key = `${state.activeTypeId}:${title}`;
  if (state.catSectionOpen[key] === undefined) state.catSectionOpen[key] = !!openByDefault;
  const isOpen = !!state.catSectionOpen[key];
  const count = filledOptCount(list);

  const section = document.createElement("section");
  section.className = "cat-section" + (isOpen ? " open" : "");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "cat-section-toggle";
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  toggle.innerHTML = `
    <div>
      <h3>${esc(title)}</h3>
      <p>${esc(hint)}</p>
    </div>
    <div class="cat-section-meta">
      <span class="cat-section-count">${count}</span>
      <span class="cat-section-chevron" aria-hidden="true">▸</span>
    </div>
  `;
  toggle.onclick = () => {
    state.catSectionOpen[key] = !state.catSectionOpen[key];
    section.classList.toggle("open", state.catSectionOpen[key]);
    toggle.setAttribute("aria-expanded", state.catSectionOpen[key] ? "true" : "false");
  };

  const body = document.createElement("div");
  body.className = "cat-section-body";
  const poll = document.createElement("div");
  poll.className = "cat-poll";
  renderOptPoll(list, poll, {
    withSizes,
    sizeLabel,
    shapeImages,
    placeholder: `Add ${title.toLowerCase().replace(/s$/, "")}…`
  });
  body.appendChild(poll);
  section.append(toggle, body);
  return section;
}

function renderCatTypeBar() {
  const bar = document.getElementById("catTypeBar");
  bar.innerHTML = "";
  FIXED_TYPES.forEach(t => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-type-chip" + (t.id === state.activeTypeId ? " on" : "");
    btn.textContent = t.name;
    btn.onclick = () => {
      state.activeTypeId = t.id;
      renderCatTypeBar();
      renderCatTypeEditor();
    };
    bar.appendChild(btn);
  });
}

function renderCatTypeEditor() {
  const editor = document.getElementById("catTypeEditor");
  editor.innerHTML = "";
  if (!state.draftCatalog) return;

  if (state.activeTypeId === "candle") {
    editor.append(
      makeCatSection(
        "Shapes",
        "Candle moulds — also offered on Resin orders (images included)",
        state.draftCatalog.candle.shapes,
        { shapeImages: true }
      ),
      makeCatSection("Colors", "Candle colors", state.draftCatalog.candle.colors),
      makeCatSection("Scents", "Candle scents", state.draftCatalog.candle.scents)
    );
    return;
  }

  if (state.activeTypeId === "resin") {
    state.draftCatalog.resin.useCandleShapes = true;
    const note = document.createElement("p");
    note.className = "cat-hint";
    note.textContent =
      "Resin orders include every Candle mould automatically, plus any resin-only shapes you add below. Expand a resin shape to add optional sizes.";
    editor.appendChild(note);
    editor.appendChild(makeCatSection(
      "Shapes",
      "Resin-only moulds / types — upload an image for each. Expand a shape to add optional sizes.",
      state.draftCatalog.resin.shapes,
      { withSizes: true, sizeLabel: "Sizes / dimensions", shapeImages: true }
    ));
    editor.appendChild(makeCatSection("Colors", "Resin colors", state.draftCatalog.resin.colors));
    return;
  }

  if (state.activeTypeId === "pipeCleaner") {
    editor.append(
      makeCatSection("Shapes", "Pipe cleaner shapes — upload an image for each shape", state.draftCatalog.pipeCleaner.shapes, { shapeImages: true }),
      makeCatSection("Sizes", "Pipe cleaner sizes", state.draftCatalog.pipeCleaner.sizes),
      makeCatSection("Colors", "Pipe cleaner colors", state.draftCatalog.pipeCleaner.colors)
    );
  }
}

export function openCategoryDialog() {
  const catDlg = document.getElementById("catDlg");
  state.draftCatalog = cloneCatalog(state.catalog);
  state.activeTypeId = "candle";
  state.catSectionOpen = {};
  renderCatTypeBar();
  renderCatTypeEditor();
  catDlg.showModal();
}

export function bindCategoryDialog() {
  const catDlg = document.getElementById("catDlg");
  const catImageFile = document.getElementById("catImageFile");

  document.getElementById("manageCategories").onclick = openCategoryDialog;
  document.getElementById("catCancel").onclick = () => catDlg.close();
  document.getElementById("closeCatDialog").onclick = () => catDlg.close();

  catImageFile.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file || !state.catImageTarget) return;
    try {
      state.catImageTarget.node.image = await readImageFile(file);
      renderOptPoll(state.catImageTarget.list, state.catImageTarget.container, {
        withSizes: state.catImageTarget.withSizes,
        sizeLabel: state.catImageTarget.sizeLabel,
        placeholder: state.catImageTarget.placeholder,
        shapeImages: state.catImageTarget.shapeImages
      });
      showToast("Shape image added");
    } catch (err) {
      alert(err.message);
    }
    e.target.value = "";
    state.catImageTarget = null;
  });

  document.getElementById("catForm").addEventListener("submit", async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      catDlg.close();
      await persistCategories(state.draftCatalog);
    } catch (err) {
      alert("Could not save categories: " + err.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
