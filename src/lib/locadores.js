// Seguimiento de locadores: datos del contrato, recorrido del expediente y pagos por mes.
// Reemplaza a los archivos CONTRATO.xlsx y PAGOS.xlsx: los datos de la persona se
// escriben una sola vez y los dos expedientes cuelgan del mismo registro.
import { todayStr, monthKey, diffDays, uid } from "./fechas";

/* ---------- recorridos del expediente ----------
   Un expediente avanza por areas. El area se repite en varios pasos, asi que
   cada paso se identifica por su POSICION, nunca por su nombre. */
export const RECORRIDO_CONTRATO = [
  "Unidad de Administracion UE 020",
  "Area de Abastecimiento",
  "Seccion de Programacion y Adquisiciones",
  "Area de Abastecimiento",
  "Area de Presupuestos",
  "Area de Bienestar",
  "Ejecucion Contractual",
];

export const RECORRIDO_PAGO = [
  "Unidad de Administracion UE 020",
  "Area de Abastecimiento",
  "Ejecucion Contractual",
  "Area de Abastecimiento",
  "Area de Contabilidad",
  "Area de Tesoreria",
];

// Paso al que vuelve un expediente observado para subsanar.
export const PASO_SUBSANACION = RECORRIDO_PAGO.indexOf("Ejecucion Contractual");

export const REQUISITOS_CONTRATO =
  "TDR + Directiva + Oficio (Crnel. Churampi) + Informe + Pedido SIGA. " +
  "Personal continuador va a UE 020; personal nuevo va a OFAD.";
export const REQUISITOS_PAGO =
  "Oficio de Estadistica + Informe con las actividades realizadas por el locador. " +
  "Se lleva en fisico y por SGD a la UE 020.";

/* ---------- expedientes ---------- */
export function expedienteVacio() {
  return { paso: 0, iniciado: "", historial: [], observado: null, finalizado: "" };
}

export function expedienteContrato(l) {
  return l.contrato || expedienteVacio();
}

export function expedientePago(l, mk) {
  return (l.pagos || {})[mk] || expedienteVacio();
}

/**
 * Meses que se pagan, en formato "YYYY-MM". Un contrato de 2 meses son 2 pagos
 * aunque las fechas toquen tres meses del calendario (ej. del 10/09 al 10/11).
 * Se cuentan `mesesContrato` meses desde el mes de inicio; si ese dato falta,
 * se recorre el calendario hasta la fecha de fin.
 */
export function mesesDelContrato(l) {
  if (!l.fechaInicio) return [];
  const [y, m] = l.fechaInicio.split("-").map(Number);
  const mk = (i) => {
    const d = new Date(y, m - 1 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const n = parseInt(l.mesesContrato, 10) || 0;
  if (n > 0) return Array.from({ length: Math.min(n, 24) }, (_, i) => mk(i));

  const fin = l.fechaFin ? l.fechaFin.slice(0, 7) : "";
  const out = [];
  for (let i = 0; i < 24; i++) {
    out.push(mk(i));
    if (!fin || mk(i) >= fin) break;
  }
  return out;
}

/** Mueve el expediente a un paso y lo anota en el historial. */
export function moverExpediente(exp, paso, nota = "") {
  const hoy = todayStr();
  return {
    ...exp,
    paso,
    iniciado: exp.iniciado || hoy,
    observado: null,
    historial: [...(exp.historial || []), { paso, fecha: hoy, nota }],
  };
}

/** Marca el expediente como observado; sigue en el mismo paso hasta que se subsane. */
export function observarExpediente(exp, motivo) {
  return {
    ...exp,
    observado: { motivo, fecha: todayStr(), paso: exp.paso },
    historial: [...(exp.historial || []), { paso: exp.paso, fecha: todayStr(), nota: `OBSERVADO: ${motivo}` }],
  };
}

/** Devuelve el expediente observado a Ejecucion Contractual para subsanar. */
export function subsanarExpediente(exp, nota = "Subsanado") {
  return moverExpediente({ ...exp, observado: null }, PASO_SUBSANACION, nota);
}

export function cerrarExpediente(exp, nota = "") {
  const hoy = todayStr();
  return {
    ...exp,
    finalizado: hoy,
    observado: null,
    historial: [...(exp.historial || []), { paso: exp.paso, fecha: hoy, nota: nota || "Finalizado" }],
  };
}

/** Dias que lleva parado el expediente en el paso actual. */
export function diasEnPaso(exp) {
  const h = (exp.historial || []).filter((x) => !x.nota?.startsWith("OBSERVADO"));
  const ultima = h.length ? h[h.length - 1].fecha : exp.iniciado;
  if (!ultima) return null;
  const d = diffDays(ultima, todayStr());
  return isNaN(d) ? null : d;
}

/* ---------- validaciones ----------
   El RUC de persona natural es 10 + DNI (8 digitos) + digito verificador. */
export function dniDesdeRuc(ruc) {
  const r = (ruc || "").trim();
  return /^10\d{9}$/.test(r) ? r.slice(2, 10) : null;
}

export function esCorreo(c) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((c || "").trim());
}

/**
 * Revisa los datos de una persona del area. Mismos criterios que para los
 * locadores, para que los avisos digan siempre lo mismo en toda la aplicacion.
 */
export function revisarPersona(p, otros = []) {
  const avisos = [];
  const dni = (p.dni || "").trim();
  const tel = (p.phone || "").replace(/\s|-/g, "");

  if (dni && !/^\d{8}$/.test(dni)) avisos.push({ campo: "dni", texto: `El DNI "${dni}" no tiene 8 digitos.` });
  if (dni) {
    const repetido = otros.find((o) => o.id !== p.id && (o.dni || "").trim() === dni);
    if (repetido) avisos.push({ campo: "dni", texto: `Ese DNI ya esta registrado en ${repetido.name}.` });
  }
  if (tel && !/^9\d{8}$/.test(tel)) {
    avisos.push({ campo: "phone", texto: `El celular "${p.phone}" no tiene 9 digitos empezando por 9.` });
  }
  if (p.email && !esCorreo(p.email)) avisos.push({ campo: "email", texto: `El correo "${p.email}" no parece valido.` });
  if (p.birthday && !/^\d{2}\/\d{2}$/.test(p.birthday.trim())) {
    avisos.push({ campo: "birthday", texto: `El cumpleanos "${p.birthday}" debe ir como DD/MM.` });
  }
  const meta = (p.metaMensual || "").toString().trim();
  if (meta && (!/^\d+$/.test(meta) || Number(meta) === 0)) {
    avisos.push({ campo: "metaMensual", texto: "La meta mensual debe ser un numero mayor que cero." });
  }
  return avisos;
}

/**
 * Revisa un locador y devuelve los problemas encontrados.
 * `otros` sirve para detectar RUC repetidos entre locadores.
 */
export function revisarLocador(l, otros = []) {
  const avisos = [];
  const dni = (l.dni || "").trim();
  const ruc = (l.ruc || "").trim();

  if (!dni) avisos.push({ campo: "dni", texto: "Falta el DNI." });
  else if (!/^\d{8}$/.test(dni)) avisos.push({ campo: "dni", texto: `El DNI "${dni}" no tiene 8 digitos.` });

  if (!ruc) avisos.push({ campo: "ruc", texto: "Falta el RUC." });
  else if (!/^\d{11}$/.test(ruc)) avisos.push({ campo: "ruc", texto: `El RUC "${ruc}" no tiene 11 digitos.` });
  else {
    const esperado = dniDesdeRuc(ruc);
    if (esperado && /^\d{8}$/.test(dni) && esperado !== dni) {
      avisos.push({ campo: "ruc", texto: `El RUC corresponde al DNI ${esperado}, pero aqui figura ${dni}.` });
    }
    const repetido = otros.find((o) => o.id !== l.id && (o.ruc || "").trim() === ruc);
    if (repetido) avisos.push({ campo: "ruc", texto: `Este RUC tambien esta registrado en ${repetido.nombre}.` });
  }

  const mensual = parseFloat(l.montoMensual) || 0;
  const meses = parseInt(l.mesesContrato, 10) || 0;
  const total = parseFloat(l.remuneracion) || 0;
  if (mensual && meses && total && mensual * meses !== total) {
    avisos.push({
      campo: "montos",
      texto: `S/ ${mensual} x ${meses} mes(es) = S/ ${mensual * meses}, pero la remuneracion dice S/ ${total}.`,
    });
  }

  if (l.correo && !esCorreo(l.correo)) avisos.push({ campo: "correo", texto: `El correo "${l.correo}" no parece valido.` });
  if (l.fechaInicio && l.fechaFin && l.fechaFin < l.fechaInicio) {
    avisos.push({ campo: "fechas", texto: "La fecha de fin es anterior a la de inicio." });
  }
  if (!l.sgd) avisos.push({ campo: "sgd", texto: "Falta el numero de expediente SGD." });

  return avisos;
}

/* ---------- consultas para el panel ---------- */
export function locadoresActivos(data) {
  return (data.locadores || []).filter((l) => l.estado !== "finalizado");
}

/** Locadores cuyo pago del mes aun no llega a Tesoreria. */
export function locadoresPendientes(data, mk = monthKey()) {
  return locadoresActivos(data).filter((l) => {
    if (!mesesDelContrato(l).includes(mk)) return false;
    const exp = expedientePago(l, mk);
    return !exp.finalizado;
  });
}

export function contratosPorVencer(data, dias = 30) {
  return locadoresActivos(data).filter((l) => {
    if (!l.fechaFin) return false;
    const d = diffDays(todayStr(), l.fechaFin);
    return !isNaN(d) && d >= 0 && d <= dias;
  });
}

export function expedientesObservados(data) {
  const out = [];
  for (const l of locadoresActivos(data)) {
    const c = expedienteContrato(l);
    if (c.observado) out.push({ locador: l, tipo: "Contrato", mk: null, observado: c.observado });
    for (const [mk, exp] of Object.entries(l.pagos || {})) {
      if (exp.observado) out.push({ locador: l, tipo: "Pago", mk, observado: exp.observado });
    }
  }
  return out;
}

export function locadorVacio() {
  return {
    id: null,
    nombre: "",
    dni: "",
    ruc: "",
    celular: "",
    correo: "",
    nroOrden: "",
    sgd: "",
    ordenServicio: "",
    siaf: "",
    ipress: "ESTADISTICA-UNIINSAN-DIRSAPOL",
    descripcionTdr: "",
    cargo: "",
    montoMensual: "",
    remuneracion: "",
    mesesContrato: 2,
    fechaInicio: todayStr(),
    fechaFin: "",
    correoAreaUsuaria: "dirsapol.estadistica@policia.gob.pe",
    estado: "activo",
    contrato: expedienteVacio(),
    pagos: {},
  };
}
/* ---------- carga inicial desde CONTRATO.xlsx y PAGOS.xlsx ----------
   Los datos personales viven en locadores.datos.js, que NO se sube a git porque el
   repositorio es publico. Si ese archivo no existe (por ejemplo en otra PC), la
   lista inicial queda vacia y la app funciona igual. Los datos van tal cual estan
   en los archivos: lo que no cuadra lo marca revisarLocador() para corregirlo en
   pantalla con el dato real a la vista. */
const datosLocales = import.meta.glob("./locadores.datos.js", { eager: true });
const SEMILLA = datosLocales["./locadores.datos.js"]?.SEMILLA || [];

/** Los 6 locadores de los archivos, listos para cargar. */
export function locadoresIniciales() {
  return SEMILLA.map((s) => ({
    ...locadorVacio(),
    ...s,
    id: uid(),
    montoMensual: String(s.montoMensual),
    remuneracion: String(s.remuneracion),
    contrato: { ...expedienteVacio(), paso: RECORRIDO_CONTRATO.length - 1, iniciado: s.fechaInicio },
    pagos: {},
  }));
}
