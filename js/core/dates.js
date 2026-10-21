export function formatOrderedAt(ms) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(ms || Date.now()));
  } catch (e) {
    return new Date(ms || Date.now()).toLocaleString();
  }
}

export function toDatetimeLocalValue(ms) {
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value) {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

export function todayLabelText() {
  return "✦ " + new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}
