// Repositorio mensual de cifras: lectura de tablas pegadas desde Excel o de archivos CSV,
// y utilidades para acumular la informacion mes a mes.
import { monthKey } from "./fechas";

const MESES_NOMBRE = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
  may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
  sep: 9, set: 9, sept: 9, setiembre: 9, septiembre: 9, oct: 10, octubre: 10,
  nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

/** Convierte una cabecera de columna en clave de mes "YYYY-MM", o null si no es un mes. */
export function leerMes(texto) {
  if (!texto) return null;
  const t = String(texto).trim().toLowerCase().replace(/\s+/g, " ");

  let m = t.match(/^(\d{4})[-/](\d{1,2})$/); // 2026-09
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, "0")}`;

  m = t.match(/^(\d{1,2})[-/](\d{4})$/); // 09/2026
  if (m) return `${m[2]}-${String(+m[1]).padStart(2, "0")}`;

  m = t.match(/^([a-zñáéíóú]+)\.?\s+(?:de\s+)?(\d{4})$/); // sep 2026 / setiembre de 2026
  if (m && MESES_NOMBRE[m[1]]) return `${m[2]}-${String(MESES_NOMBRE[m[1]]).padStart(2, "0")}`;

  return null;
}

/** Convierte "1,234.5" o "1.234,5" o "12,5" en numero. Devuelve null si no hay cifra. */
export function leerNumero(texto) {
  if (texto === null || texto === undefined) return null;
  let s = String(texto).trim().replace(/\s/g, "").replace(/^S\/\.?/i, "").replace(/%$/, "");
  if (!s) return null;

  const tieneComa = s.includes(",");
  const tienePunto = s.includes(".");
  if (tieneComa && tienePunto) {
    // El separador decimal es el que aparece mas a la derecha.
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (tieneComa) {
    const decimales = s.length - s.lastIndexOf(",") - 1;
    s = s.split(",").length === 2 && decimales <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (tienePunto) {
    // Un punto seguido de EXACTAMENTE tres digitos es separador de miles:
    // en los cuadros "1.300" son mil trescientas atenciones, no 1,3.
    // Con una o dos cifras detras ("1.5", "0.75") si es decimal.
    const grupos = s.split(".");
    const esMiles =
      grupos.length > 2 || (grupos.length === 2 && grupos[1].length === 3 && /^\d+$/.test(grupos[1]));
    if (esMiles && grupos.every((g, i) => (i === 0 ? /^-?\d+$/ : /^\d{3}$/).test(g))) {
      s = grupos.join("");
    }
  }

  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Detecta el separador (tabulacion al pegar de Excel, ; o , en archivos CSV).
 * Mira TODAS las lineas, no solo la primera: los cuadros suelen empezar por un
 * titulo sin separadores ("PRODUCCION DE IPRESS PNP DE NIVEL I") y mirando solo
 * esa linea la tabla entera se leia como una sola columna.
 * Gana el separador que mas veces aparece de forma consistente.
 */
function detectarSeparador(lineas) {
  const candidatos = ["\t", ";", ","];
  let mejor = null;
  let max = 0;
  candidatos.forEach((c) => {
    // Total de apariciones, pero solo en las lineas que lo tienen: asi una tabla
    // de 20 filas con tabulador gana a un par de comas sueltas en el titulo.
    const conSeparador = lineas.filter((l) => l.includes(c));
    const total = conSeparador.reduce((s, l) => s + l.split(c).length - 1, 0);
    if (total > max) {
      max = total;
      mejor = c;
    }
  });
  return max === 0 ? null : mejor;
}

/** Parte un texto pegado o el contenido de un CSV en una matriz de celdas. */
export function parsearTabla(texto) {
  const lineas = String(texto || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim());
  if (!lineas.length) return [];
  const sep = detectarSeparador(lineas);
  if (!sep) return lineas.map((l) => [l.trim()]);
  return lineas.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
}

/** Reconoce tambien meses escritos solos ("ENERO"), usando el año indicado. */
export function leerMesLibre(texto, anio) {
  const directo = leerMes(texto);
  if (directo) return directo;
  const t = String(texto || "").trim().toLowerCase().replace(/\./g, "");
  if (anio && MESES_NOMBRE[t]) return `${anio}-${String(MESES_NOMBRE[t]).padStart(2, "0")}`;
  return null;
}

/** Filas y columnas de totales que no deben cargarse como un mes ni como un indicador. */
function esTotal(texto) {
  return /^(total|totales|suma|acumulado)\b/i.test(String(texto || "").trim());
}

/** Busca el año en un titulo tipo "PERIODO 2026". */
export function detectarAnio(texto) {
  const m = String(texto || "").match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

/**
 * Quita las filas de titulo del inicio (las que traen una sola celda con contenido,
 * como "PRODUCCION DE IPRESS PNP DE NIVEL I" o "PERIODO 2026").
 */
function quitarTitulos(matriz) {
  let i = 0;
  let anio = null;
  let titulo = "";
  while (i < matriz.length) {
    const llenas = matriz[i].filter((c) => c !== "").length;
    if (llenas > 1) break;
    const texto = matriz[i].join(" ").trim();
    const a = detectarAnio(texto);
    if (a) anio = a;
    else if (texto && !titulo) titulo = texto;
    i++;
  }
  return { matriz: matriz.slice(i), anio, titulo };
}

/**
 * Propone un grupo a partir del titulo del cuadro. Los mismos indicadores
 * ("CONSULTA EXTERNA - CONSULTA MEDICA") existen en Nivel I, II y III: sin un
 * grupo que los separe, cargar un cuadro pisaria las cifras del otro.
 */
export function sugerirGrupo(titulo) {
  if (!titulo) return "";
  const m = String(titulo).match(/nivel\s+([ivx]+|\d+)\b/i);
  if (m) return `IPRESS Nivel ${m[1].toUpperCase()}`;
  return String(titulo).trim().replace(/\s+/g, " ").slice(0, 60);
}

/**
 * Une cabeceras de varios niveles. Al copiar de Excel, una celda combinada deja
 * el texto en la primera columna y vacias las demas: por eso los niveles de arriba
 * se arrastran hacia la derecha y el ultimo nivel se respeta tal cual.
 */
function combinarCabeceras(filas) {
  if (!filas.length) return [];
  const ancho = Math.max(...filas.map((f) => f.length));
  const niveles = filas.map((fila, idx) => {
    const celdas = Array.from({ length: ancho }, (_, c) => (fila[c] || "").trim());
    if (idx === filas.length - 1) return celdas; // el ultimo nivel no se arrastra
    let ultimo = "";
    return celdas.map((c) => (c ? ((ultimo = c), c) : ultimo));
  });

  return Array.from({ length: ancho }, (_, c) => {
    const partes = [];
    niveles.forEach((n) => {
      const v = n[c];
      if (v && !partes.includes(v)) partes.push(v);
    });
    return partes.join(" - ");
  });
}

/**
 * Interpreta la tabla pegada o el CSV. Reconoce tres disposiciones:
 *  - meses en filas   (MES en la primera columna, indicadores en las columnas)
 *  - meses en columnas (indicador en la primera columna, meses en la cabecera)
 *  - indicador | valor (una sola cifra, va al mes indicado)
 * Devuelve { modo, meses, filas: [{ nombre, valores }], ignoradas, anioDetectado }
 */
export function interpretarTabla(texto, opciones = {}) {
  const op = typeof opciones === "string" ? { mesPorDefecto: opciones } : opciones;
  const mesPorDefecto = op.mesPorDefecto || monthKey();

  const cruda = parsearTabla(texto);
  if (!cruda.length) return { modo: "vacio", meses: [], filas: [], ignoradas: 0, anioDetectado: null };

  const sinTitulos = quitarTitulos(cruda);
  const matriz = sinTitulos.matriz;
  const anio = op.anio || sinTitulos.anio || Number(mesPorDefecto.slice(0, 4));
  if (!matriz.length) return { modo: "vacio", meses: [], filas: [], ignoradas: 0, anioDetectado: sinTitulos.anio };

  const base = {
    ignoradas: 0,
    anioDetectado: sinTitulos.anio,
    anioUsado: anio,
    tituloDetectado: sinTitulos.titulo,
    grupoSugerido: sugerirGrupo(sinTitulos.titulo),
  };

  /* --- disposicion 1: los meses bajan por la primera columna --- */
  const filasMes = [];
  matriz.forEach((f, i) => {
    const mk = leerMesLibre(f[0], anio);
    if (mk) filasMes.push({ i, mk });
  });

  if (filasMes.length >= 2) {
    const nombres = combinarCabeceras(matriz.slice(0, filasMes[0].i));
    const porNombre = new Map();
    let ignoradas = 0;

    filasMes.forEach(({ i, mk }) => {
      matriz[i].forEach((celda, col) => {
        if (col === 0) return;
        const nombre = (nombres[col] || "").trim();
        if (!nombre || esTotal(nombre)) return;
        const n = leerNumero(celda);
        if (n === null) return;
        if (!porNombre.has(nombre)) porNombre.set(nombre, {});
        porNombre.get(nombre)[mk] = n;
      });
    });

    // Solo se cuentan como ignoradas las filas que parecen datos: las notas al pie
    // ("NOTA:", "* El hospital...") traen una sola celda y no son un descarte real.
    matriz.forEach((f, i) => {
      if (i < filasMes[0].i) return;
      if (filasMes.some((x) => x.i === i)) return;
      if (esTotal(f[0])) return;
      const llenas = f.filter((c) => c !== "").length;
      const traeCifra = f.slice(1).some((c) => leerNumero(c) !== null);
      if (llenas >= 2 && traeCifra) ignoradas++;
    });

    return {
      ...base,
      modo: "meses-en-filas",
      meses: filasMes.map((x) => x.mk),
      filas: [...porNombre.entries()].map(([nombre, valores]) => ({ nombre, valores })),
      ignoradas,
    };
  }

  /* --- disposicion 2 y 3: el indicador baja por la primera columna --- */
  const cabecera = matriz[0];
  // leerMesLibre, no leerMes: en los cuadros la cabecera dice "ENERO", no "2026-01".
  const mesesCol = cabecera.map((c, i) => (i === 0 ? null : leerMesLibre(c, anio)));
  const hayMeses = mesesCol.some(Boolean);
  const desde = hayMeses || leerNumero(cabecera[1]) === null ? 1 : 0;

  const filas = [];
  let ignoradas = 0;

  for (let i = desde; i < matriz.length; i++) {
    const celdas = matriz[i];
    const nombre = (celdas[0] || "").trim();
    if (!nombre || esTotal(nombre)) {
      if (nombre) continue;
      ignoradas++;
      continue;
    }
    const valores = {};
    if (hayMeses) {
      mesesCol.forEach((mk, col) => {
        if (!mk || esTotal(cabecera[col])) return;
        const n = leerNumero(celdas[col]);
        if (n !== null) valores[mk] = n;
      });
    } else {
      const n = leerNumero(celdas[1]);
      if (n === null) {
        ignoradas++;
        continue;
      }
      valores[mesPorDefecto] = n;
    }
    if (!Object.keys(valores).length) {
      ignoradas++;
      continue;
    }
    filas.push({ nombre, valores });
  }

  return {
    ...base,
    modo: hayMeses ? "meses-en-columnas" : "simple",
    meses: hayMeses ? mesesCol.filter(Boolean) : [mesPorDefecto],
    filas,
    ignoradas,
  };
}

/**
 * Mezcla las filas leidas con los indicadores existentes.
 * La identidad de un indicador es grupo + nombre (sin distinguir mayusculas ni tildes),
 * de modo que "CONSULTA EXTERNA - CONSULTA MEDICA" de Nivel I y de Nivel II conviven.
 * Los que coinciden se actualizan; el resto se agrega. Nunca se borra un mes que no venia.
 */
export function combinarIndicadores(indicadores, filas, nuevoId, grupo = "") {
  const norm = (s) =>
    String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const clave = (g, n) => `${norm(g)}||${norm(n)}`;

  let actualizados = 0;
  let agregados = 0;
  let celdas = 0;

  const resultado = indicadores.map((ind) => ({ ...ind, valores: { ...(ind.valores || {}) } }));
  const indice = {};
  resultado.forEach((ind, i) => (indice[clave(ind.categoria, ind.nombre)] = i));

  filas.forEach((fila) => {
    const k = clave(grupo, fila.nombre);
    celdas += Object.keys(fila.valores).length;
    if (indice[k] !== undefined) {
      const ind = resultado[indice[k]];
      ind.valores = { ...ind.valores, ...fila.valores };
      actualizados++;
    } else {
      resultado.push({
        id: nuevoId(),
        nombre: fila.nombre,
        unidad: "",
        categoria: grupo,
        valores: { ...fila.valores },
      });
      indice[k] = resultado.length - 1;
      agregados++;
    }
  });

  return { indicadores: resultado, actualizados, agregados, celdas };
}

/** Variacion porcentual entre dos meses. */
export function variacion(actual, anterior) {
  if (actual === undefined || actual === null) return null;
  if (anterior === undefined || anterior === null || anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** Formatea una cifra para mostrarla (sin decimales si es entera). */
export function fmtNumero(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return Number.isInteger(num) ? num.toLocaleString("es-PE") : num.toLocaleString("es-PE", { maximumFractionDigits: 2 });
}
