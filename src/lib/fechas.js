// Fechas siempre en hora LOCAL (Peru, UTC-5).
// Usar toISOString() aqui haria que desde las 19:00 la app creyera que ya es el dia siguiente.

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function monthKey(d = new Date()) {
  return todayStr(d).slice(0, 7);
}

export function diffDays(fromStr, toStr) {
  if (!fromStr || !toStr) return NaN;
  const a = new Date(fromStr + "T00:00:00");
  const b = new Date(toStr + "T00:00:00");
  if (isNaN(a) || isNaN(b)) return NaN;
  return Math.round((b - a) / 86400000);
}

export function daysDiff(dateStr) {
  return diffDays(todayStr(), dateStr);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Limpia los textos de un registro antes de guardarlo: quita espacios al inicio
 * y al final y colapsa los repetidos. Sin esto quedan nombres como
 * "APELLIDO NOMBRE " con un espacio final, que descuadran busquedas y ordenaciones.
 * No toca numeros, booleanos, fechas ni objetos anidados (tramites, historiales).
 */
export function limpiarRegistro(obj) {
  const out = { ...obj };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === "string") out[k] = v.trim().replace(/[ \t]{2,}/g, " ");
  }
  return out;
}

export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MESES[parseInt(m, 10) - 1]} ${y}`;
}

// Ultimos n meses terminando en el mes actual: ["2026-04", ..., "2026-09"]
export function lastNMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
}

export function last6Months() {
  return lastNMonths(6);
}

export function fmtFechaHora(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${fmtDate(todayStr(d))} ${hh}:${mm}`;
}

// Suma dias calendario a una fecha "YYYY-MM-DD".
export function sumarDias(fechaStr, n) {
  if (!fechaStr) return "";
  const d = new Date(fechaStr + "T00:00:00");
  if (isNaN(d)) return "";
  d.setDate(d.getDate() + Number(n || 0));
  return todayStr(d);
}

// Ultimos n meses hacia atras incluyendo el actual, del mas nuevo al mas viejo.
export function mesesRecientes(n = 12) {
  return lastNMonths(n).slice().reverse();
}
