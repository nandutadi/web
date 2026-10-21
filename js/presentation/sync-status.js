export function setSyncStatus(mode, label) {
  const pill = document.getElementById("syncPill");
  const text = document.getElementById("syncLabel");
  if (!pill || !text) return;
  pill.className = "sync-pill " + mode;
  text.textContent = label;
}
