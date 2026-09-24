// Control de acceso local: usuario y clave guardados en esta PC.
// La clave nunca se guarda en texto plano: se deriva con PBKDF2-SHA256 y una sal aleatoria.
// Vive en una clave de localStorage aparte, asi NO viaja dentro del archivo de respaldo.

export const ACCESO_KEY = "gestion-oficina-acceso";
const SESION_KEY = "gestion-oficina-sesion";
const ITERACIONES = 150000;
export const CLAVE_MINIMA = 6;

function bytesAHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexABytes(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));
}

function subtle() {
  const s = window.crypto?.subtle;
  if (!s) {
    throw new Error("El navegador no permite cifrar aqui. Abre la app desde http://localhost:5173 o administracion-estadistica.localhost.");
  }
  return s;
}

async function derivar(clave, saltHex) {
  const enc = new TextEncoder();
  const base = await subtle().importKey("raw", enc.encode(clave), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexABytes(saltHex), iterations: ITERACIONES },
    base,
    256
  );
  return bytesAHex(bits);
}

function normalizarUsuario(u) {
  return (u || "").trim().toLowerCase();
}

/* ---------- credenciales ---------- */
export function leerAcceso() {
  try {
    const raw = window.localStorage.getItem(ACCESO_KEY);
    const a = raw ? JSON.parse(raw) : null;
    return a && a.usuario && a.salt && a.hash ? a : null;
  } catch (e) {
    return null;
  }
}

export function hayAcceso() {
  return leerAcceso() !== null;
}

export async function crearAcceso(usuario, clave) {
  const u = normalizarUsuario(usuario);
  if (!u) throw new Error("Escribe un nombre de usuario.");
  if ((clave || "").length < CLAVE_MINIMA) throw new Error(`La clave debe tener al menos ${CLAVE_MINIMA} caracteres.`);
  const salt = bytesAHex(window.crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derivar(clave, salt);
  window.localStorage.setItem(ACCESO_KEY, JSON.stringify({ usuario: u, salt, hash, creado: new Date().toISOString() }));
}

export async function verificarAcceso(usuario, clave) {
  const a = leerAcceso();
  if (!a) return false;
  if (normalizarUsuario(usuario) !== a.usuario) return false;
  const hash = await derivar(clave || "", a.salt);
  return hash === a.hash;
}

export async function cambiarClave(claveActual, claveNueva) {
  const a = leerAcceso();
  if (!a) throw new Error("No hay un acceso configurado.");
  if (!(await verificarAcceso(a.usuario, claveActual))) throw new Error("La clave actual no es correcta.");
  await crearAcceso(a.usuario, claveNueva);
}

/* ---------- control de intentos fallidos ----------
   Vive en localStorage, no en la pantalla: en memoria bastaba recargar con F5
   para reiniciar el contador y seguir probando claves sin limite real. */
const INTENTOS_KEY = "gestion-oficina-intentos";
export const MAX_INTENTOS = 5;
const ESPERAS_SEG = [30, 60, 300, 900]; // sube con cada bloqueo: 30s, 1min, 5min, 15min

function leerIntentos() {
  try {
    const v = JSON.parse(window.localStorage.getItem(INTENTOS_KEY) || "null");
    return v && typeof v === "object" ? { fallos: v.fallos || 0, hasta: v.hasta || 0, bloqueos: v.bloqueos || 0 } : { fallos: 0, hasta: 0, bloqueos: 0 };
  } catch (e) {
    return { fallos: 0, hasta: 0, bloqueos: 0 };
  }
}

function escribirIntentos(v) {
  try {
    window.localStorage.setItem(INTENTOS_KEY, JSON.stringify(v));
  } catch (e) {
    // sin espacio: el control se degrada, pero no impide ingresar
  }
}

/** Segundos que faltan para poder reintentar. 0 si no esta bloqueado. */
export function segundosBloqueado() {
  const { hasta } = leerIntentos();
  return Math.max(0, Math.ceil((hasta - Date.now()) / 1000));
}

export function intentosFallidos() {
  return leerIntentos().fallos;
}

/** Anota un intento fallido y bloquea al llegar al maximo. Devuelve el estado. */
export function registrarFallo() {
  const v = leerIntentos();
  v.fallos += 1;
  if (v.fallos >= MAX_INTENTOS) {
    const espera = ESPERAS_SEG[Math.min(v.bloqueos, ESPERAS_SEG.length - 1)];
    v.hasta = Date.now() + espera * 1000;
    v.bloqueos += 1;
    v.fallos = 0;
    escribirIntentos(v);
    return { bloqueado: true, segundos: espera, fallos: 0 };
  }
  escribirIntentos(v);
  return { bloqueado: false, segundos: 0, fallos: v.fallos };
}

/** Ingreso correcto: se borra todo el historial de intentos. */
export function limpiarIntentos() {
  try {
    window.localStorage.removeItem(INTENTOS_KEY);
  } catch (e) {
    // nada que hacer
  }
}

/* ---------- sesion (se cierra al cerrar el navegador) ---------- */
export function sesionActiva() {
  try {
    return window.sessionStorage.getItem(SESION_KEY) === "1" && hayAcceso();
  } catch (e) {
    return false;
  }
}

export function abrirSesion() {
  window.sessionStorage.setItem(SESION_KEY, "1");
}

export function cerrarSesion() {
  window.sessionStorage.removeItem(SESION_KEY);
}
