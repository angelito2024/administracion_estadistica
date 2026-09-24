// Respaldo automatico a una carpeta real del equipo (o de la red).
//
// Las copias del navegador viven en el mismo localStorage que los datos: no
// protegen de lo que de verdad hace perder informacion (limpiar datos de
// navegacion, perfil danado, formateo o cambio de PC). Esto escribe el archivo
// fuera del navegador, en la carpeta que elija el usuario una sola vez.
//
// Usa File System Access API (Edge y Chrome). El permiso sobre la carpeta se
// conserva entre sesiones guardando su "handle" en IndexedDB; el navegador
// puede volver a pedir confirmacion, y entonces se solicita de nuevo.
import { todayStr, fmtFechaHora } from "./fechas";

const DB = "gestion-oficina-respaldo";
const STORE = "handles";
const CLAVE = "carpeta";
const ESTADO_KEY = "gestion-oficina-respaldo-auto";
export const COPIAS_A_CONSERVAR = 30;

export function soportaCarpeta() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

/* ---------- IndexedDB: unico sitio donde se puede guardar un handle ---------- */
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function guardarHandle(handle) {
  const db = await abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, CLAVE);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function leerHandle() {
  try {
    const db = await abrirDB();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(CLAVE);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch (e) {
    return null;
  }
}

async function olvidarHandle() {
  try {
    const db = await abrirDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(CLAVE);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
    db.close();
  } catch (e) {
    // nada que hacer
  }
}

/* ---------- estado visible (nombre de carpeta y ultima escritura) ---------- */
export function leerEstado() {
  try {
    return JSON.parse(window.localStorage.getItem(ESTADO_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function escribirEstado(estado) {
  try {
    window.localStorage.setItem(ESTADO_KEY, JSON.stringify(estado));
  } catch (e) {
    // el estado es informativo; si no se puede guardar, no afecta al respaldo
  }
}

/* ---------- permisos ---------- */
async function tienePermiso(handle, pedir) {
  if (!handle?.queryPermission) return false;
  const opciones = { mode: "readwrite" };
  if ((await handle.queryPermission(opciones)) === "granted") return true;
  if (!pedir) return false;
  return (await handle.requestPermission(opciones)) === "granted";
}

/* ---------- configuracion ---------- */
/** Pide al usuario la carpeta de respaldo. Debe llamarse desde un clic. */
export async function elegirCarpeta() {
  if (!soportaCarpeta()) {
    throw new Error(
      "Este navegador no permite elegir una carpeta. Usa Microsoft Edge o Chrome, " +
        "o descarga el respaldo a mano cada semana."
    );
  }
  const handle = await window.showDirectoryPicker({ id: "respaldo-oficina", mode: "readwrite" });
  if (!(await tienePermiso(handle, true))) throw new Error("No se concedio permiso para escribir en esa carpeta.");
  await guardarHandle(handle);
  escribirEstado({ carpeta: handle.name, ultimo: null, ultimoArchivo: null });
  return handle.name;
}

export async function quitarCarpeta() {
  await olvidarHandle();
  escribirEstado(null);
}

/* ---------- escritura ---------- */
async function escribirArchivo(handle, nombre, contenido) {
  const archivo = await handle.getFileHandle(nombre, { create: true });
  const w = await archivo.createWritable();
  await w.write(contenido);
  await w.close();
}

/** Deja como mucho COPIAS_A_CONSERVAR respaldos en la carpeta. */
async function podarAntiguos(handle) {
  const nombres = [];
  for await (const [nombre, entrada] of handle.entries()) {
    if (entrada.kind === "file" && /^respaldo-oficina-\d{4}-\d{2}-\d{2}\.json$/.test(nombre)) nombres.push(nombre);
  }
  nombres.sort();
  for (const viejo of nombres.slice(0, Math.max(0, nombres.length - COPIAS_A_CONSERVAR))) {
    try {
      await handle.removeEntry(viejo);
    } catch (e) {
      // si no se puede borrar uno, se sigue: no es critico
    }
  }
}

/**
 * Escribe el respaldo en la carpeta configurada.
 * `pedirPermiso` solo puede ser true si viene de un clic del usuario.
 * Devuelve { ok, motivo, archivo }.
 */
export async function respaldarEnCarpeta(data, { pedirPermiso = false } = {}) {
  const handle = await leerHandle();
  if (!handle) return { ok: false, motivo: "sin-carpeta" };
  if (!(await tienePermiso(handle, pedirPermiso))) return { ok: false, motivo: "sin-permiso" };

  const paquete = {
    _app: "gestion-oficina",
    _version: 1,
    _exportado: new Date().toISOString(),
    _origen: "respaldo automatico",
    data,
  };
  const nombre = `respaldo-oficina-${todayStr()}.json`;
  try {
    await escribirArchivo(handle, nombre, JSON.stringify(paquete, null, 2));
    await podarAntiguos(handle);
    escribirEstado({ carpeta: handle.name, ultimo: todayStr(), ultimoArchivo: nombre, hora: fmtFechaHora() });
    return { ok: true, archivo: nombre };
  } catch (e) {
    return { ok: false, motivo: "error", detalle: e.message };
  }
}

/** Respaldo silencioso al abrir la app: como mucho uno por dia. */
export async function respaldarSiTocaHoy(data) {
  const estado = leerEstado();
  if (!estado?.carpeta || estado.ultimo === todayStr()) return { ok: false, motivo: "no-toca" };
  return respaldarEnCarpeta(data, { pedirPermiso: false });
}
