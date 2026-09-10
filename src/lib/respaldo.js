// Repositorio de respaldo: exportar / importar / copias automaticas.
import { todayStr, fmtFechaHora, monthLabel } from "./fechas";

export const SNAPSHOT_KEY = "gestion-oficina-copias";
export const MAX_SNAPSHOTS = 10;

/* ---------- descarga de archivos ---------- */
function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- respaldo completo (JSON) ---------- */
export function exportarRespaldo(data) {
  const paquete = {
    _app: "gestion-oficina",
    _version: 1,
    _exportado: new Date().toISOString(),
    data,
  };
  descargar(`respaldo-oficina-${todayStr()}.json`, JSON.stringify(paquete, null, 2), "application/json");
  return todayStr();
}

export function leerRespaldo(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("No se pudo leer el archivo."));
    fr.onload = () => {
      try {
        const parsed = JSON.parse(fr.result);
        const data = parsed && parsed._app === "gestion-oficina" ? parsed.data : parsed;
        if (!data || typeof data !== "object" || !Array.isArray(data.tasks)) {
          reject(new Error("El archivo no parece un respaldo valido de esta app."));
          return;
        }
        resolve(data);
      } catch (e) {
        reject(new Error("El archivo esta danado o no es un respaldo de esta app."));
      }
    };
    fr.readAsText(file);
  });
}

/* ---------- copias automaticas locales (una por dia, ultimas 10) ---------- */
export function listarCopias() {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function guardarCopiaDiaria(data) {
  try {
    const copias = listarCopias();
    const hoy = todayStr();
    const sinHoy = copias.filter((c) => c.fecha !== hoy);
    const nueva = { fecha: hoy, hora: fmtFechaHora(), json: JSON.stringify(data) };
    const next = [nueva, ...sinHoy].slice(0, MAX_SNAPSHOTS);
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    return listarCopias();
  }
}

export function restaurarCopia(fecha) {
  const copia = listarCopias().find((c) => c.fecha === fecha);
  if (!copia) throw new Error("Esa copia ya no existe.");
  return JSON.parse(copia.json);
}

/* ---------- exportacion a Excel (CSV con ; y BOM para tildes) ---------- */
function aCSV(cabeceras, filas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [cabeceras.join(";"), ...filas.map((f) => f.map(esc).join(";"))];
  return "\uFEFF" + lineas.join("\r\n");
}

export function exportarTareasCSV(data, staffById) {
  const filas = data.tasks.map((t) => [
    t.title,
    t.category,
    staffById[t.assignedTo]?.name || "Sin asignar",
    t.priority,
    t.status,
    t.createdAt || "",
    t.dueDate || "",
    t.completedAt || "",
    t.notes || "",
  ]);
  descargar(
    `tareas-${todayStr()}.csv`,
    aCSV(["Tarea", "Categoria", "Asignado a", "Prioridad", "Estado", "Creada", "Fecha limite", "Completada", "Notas"], filas),
    "text/csv;charset=utf-8"
  );
}

export function exportarDesempenoCSV(filas, etiquetaPeriodo) {
  const datos = filas.map((f) => [
    f.persona.name,
    f.persona.role || "",
    f.asignadas,
    f.completadas,
    f.aTiempo,
    f.tarde,
    f.pendientes,
    f.atrasadas,
    f.reprogramadas,
    f.avancePendientes === null ? "" : f.avancePendientes + "%",
    f.cumplimiento === null ? "" : f.cumplimiento + "%",
    f.puntualidad === null ? "" : f.puntualidad + "%",
    f.promedioDias === null ? "" : f.promedioDias,
    f.meta || "",
    f.avanceMeta === null ? "" : f.avanceMeta + "%",
    f.estado.label,
  ]);
  descargar(
    `desempeno-${etiquetaPeriodo}-${todayStr()}.csv`,
    aCSV(
      ["Personal", "Grado", "Asignadas", "Completadas", "A tiempo", "Tarde", "Pendientes", "Atrasadas", "Reprogramadas", "Avance de lo pendiente",
       "Cumplimiento", "Puntualidad", "Dias promedio", "Meta", "Avance meta", "Situacion"],
      datos
    ),
    "text/csv;charset=utf-8"
  );
}

export function exportarReportesCSV(data, meses) {
  const filas = data.reports.map((r) => [
    r.name,
    r.category,
    r.dueDay,
    ...meses.map((mk) => ((r.months || {})[mk] === "completado" ? "Enviado" : "Pendiente")),
  ]);
  descargar(
    `reportes-${todayStr()}.csv`,
    aCSV(["Reporte", "Area", "Dia limite", ...meses.map(monthLabel)], filas),
    "text/csv;charset=utf-8"
  );
}

const ETAPAS_LOCADOR = [
  ["informe", "Informe"],
  ["conformidad", "Conformidad"],
  ["recibo", "Recibo honorarios"],
  ["pago", "Pago"],
];

export function exportarDocumentosCSV(data, staffById) {
  const filas = (data.documentos || []).map((d) => [
    d.tipo, d.nro, d.asunto, d.remitente,
    d.fechaRecepcion || "", d.fechaLimite || "",
    d.estado === "respondido" ? "Respondido" : d.estado === "en_proceso" ? "En elaboracion" : "Por responder",
    d.nroRespuesta || "", d.fechaRespuesta || "",
    staffById[d.responsable]?.name || "Sin asignar",
    d.notas || "",
  ]);
  descargar(
    `documentos-${todayStr()}.csv`,
    aCSV(
      ["Tipo", "N°", "Asunto", "Remitente", "Recibido", "Responder hasta", "Estado",
       "N° respuesta", "Fecha respuesta", "Responsable", "Observaciones"],
      filas
    ),
    "text/csv;charset=utf-8"
  );
}

export function exportarLocadoresCSV(data, mes) {
  const filas = (data.locadores || []).map((l) => {
    const t = (l.tramites || {})[mes] || {};
    return [
      l.nombre, l.dni || "", l.ruc || "", l.servicio || "", l.nroContrato || "",
      l.montoMensual || "", l.fechaInicio || "", l.fechaFin || "",
      l.estado === "finalizado" ? "Finalizado" : "Activo",
      ...ETAPAS_LOCADOR.map(([id]) => (t[id]?.hecho ? t[id].fecha || "Si" : "Pendiente")),
      t.observacion || "",
    ];
  });
  descargar(
    `locadores-${mes}-${todayStr()}.csv`,
    aCSV(
      ["Locador", "DNI", "RUC", "Servicio", "N° contrato", "Monto mensual", "Inicio", "Fin", "Situacion",
       ...ETAPAS_LOCADOR.map(([, l]) => l), "Observacion del mes"],
      filas
    ),
    "text/csv;charset=utf-8"
  );
}

/** Matriz del repositorio mensual: indicadores en filas, meses en columnas. */
export function exportarConsolidadoCSV(indicadores, meses, anio) {
  const filas = (indicadores || []).map((ind) => {
    const v = ind.valores || {};
    const total = meses.reduce((s, mk) => s + (v[mk] || 0), 0);
    return [
      ind.nombre,
      ind.unidad || "",
      ind.categoria || "",
      ...meses.map((mk) => (v[mk] === undefined ? "" : v[mk])),
      total,
    ];
  });
  descargar(
    `consolidado-${anio}-${todayStr()}.csv`,
    aCSV(["Indicador", "Unidad", "Grupo", ...meses.map(monthLabel), "Total"], filas),
    "text/csv;charset=utf-8"
  );
}
