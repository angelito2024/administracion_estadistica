import { useRef, useState } from "react";
import { Download, Upload, ShieldCheck, AlertTriangle, RotateCcw, Database, SpellCheck2 } from "lucide-react";
import { todayStr, fmtDate, diffDays, lastNMonths, monthKey } from "../lib/fechas";
import {
  exportarRespaldo,
  leerRespaldo,
  listarCopias,
  restaurarCopia,
  exportarTareasCSV,
  exportarReportesCSV,
  exportarDocumentosCSV,
  exportarLocadoresCSV,
} from "../lib/respaldo";
import { totalPalabrasDiccionario } from "../lib/corrector";

export default function Respaldo({ data, persist, staffById }) {
  const inputRef = useRef(null);
  const [mensaje, setMensaje] = useState(null);
  const [copias, setCopias] = useState(() => listarCopias());

  const ultimo = data.settings?.ultimoRespaldo || null;
  const diasSinRespaldo = ultimo ? diffDays(ultimo, todayStr()) : null;
  const alerta = ultimo === null || diasSinRespaldo >= 7;

  const registros =
    data.staff.length + data.tasks.length + data.reports.length + data.adhoc.length + data.archive.length +
    (data.documentos || []).length + (data.locadores || []).length + (data.indicadores || []).length;

  const correccionActiva = (data.settings || {}).correccion !== false;

  function alternarCorreccion() {
    persist({ ...data, settings: { ...(data.settings || {}), correccion: !correccionActiva } });
  }

  function exportar() {
    const fecha = exportarRespaldo(data);
    persist({ ...data, settings: { ...(data.settings || {}), ultimoRespaldo: fecha } });
    setMensaje({ tipo: "ok", texto: "Respaldo descargado. Guardalo en una USB o en la carpeta de red de la oficina." });
  }

  async function importar(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const nueva = await leerRespaldo(file);
      const resumen =
        `${(nueva.staff || []).length} personas, ${(nueva.tasks || []).length} tareas, ` +
        `${(nueva.reports || []).length} reportes fijos, ${(nueva.archive || []).length} documentos`;
      const ok = window.confirm(
        `El archivo contiene: ${resumen}.\n\n` +
          "Esto REEMPLAZA toda la informacion actual de esta computadora. " +
          "Se guardara una copia de lo actual antes de reemplazar.\n\n¿Continuar?"
      );
      if (!ok) return;
      persist({ ...nueva, settings: { ...(nueva.settings || {}), ultimoRespaldo: ultimo } });
      setCopias(listarCopias());
      setMensaje({ tipo: "ok", texto: "Respaldo restaurado correctamente." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    }
  }

  function restaurar(fecha) {
    const ok = window.confirm(
      `Volver a la copia del ${fmtDate(fecha)}.\n\n` +
        "Se perdera lo registrado despues de esa fecha. ¿Continuar?"
    );
    if (!ok) return;
    try {
      persist(restaurarCopia(fecha));
      setMensaje({ tipo: "ok", texto: `Se restauro la copia del ${fmtDate(fecha)}.` });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    }
  }

  return (
    <div className="space-y-7">
      <div
        className={`rounded border p-4 flex items-start gap-3 ${
          alerta ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"
        }`}
      >
        {alerta ? (
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        )}
        <div className="text-sm">
          {ultimo === null ? (
            <>
              <p className="font-medium text-amber-900">Nunca has descargado un respaldo</p>
              <p className="text-amber-800 text-xs mt-0.5">
                Toda la informacion vive solo en este navegador. Si se borran los datos de navegacion o falla la PC,
                se pierde. Descarga un respaldo hoy mismo y repitelo cada semana.
              </p>
            </>
          ) : alerta ? (
            <>
              <p className="font-medium text-amber-900">
                Ultimo respaldo hace {diasSinRespaldo} dia(s) — {fmtDate(ultimo)}
              </p>
              <p className="text-amber-800 text-xs mt-0.5">Conviene descargar uno nuevo.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-emerald-900">Respaldo al dia — {fmtDate(ultimo)}</p>
              <p className="text-emerald-800 text-xs mt-0.5">
                {registros} registro(s) protegidos. Repite el respaldo cada semana.
              </p>
            </>
          )}
        </div>
      </div>

      {mensaje && (
        <div
          className={`text-sm rounded border px-3 py-2 ${
            mensaje.tipo === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-1">Respaldo completo</h3>
        <p className="text-xs text-slate-500 mb-3">
          Un solo archivo con todo: personal, tareas, reportes, solicitudes y archivo. Es lo que permite pasar la
          informacion a otra PC o recuperarla si esta falla.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportar}
            className="flex items-center gap-1.5 text-sm bg-pnp-verde text-white rounded px-3 py-2"
          >
            <Download size={15} /> Descargar respaldo
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-700 rounded px-3 py-2"
          >
            <Upload size={15} /> Restaurar desde archivo
          </button>
          <input ref={inputRef} type="file" accept=".json,application/json" onChange={importar} className="hidden" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-1">Exportar a Excel</h3>
        <p className="text-xs text-slate-500 mb-3">
          Para adjuntar en informes. Se abren directamente en Excel.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => exportarTareasCSV(data, staffById)}
            className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-700 rounded px-3 py-2"
          >
            <Download size={15} /> Tareas ({data.tasks.length})
          </button>
          <button
            onClick={() => exportarReportesCSV(data, lastNMonths(6))}
            className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-700 rounded px-3 py-2"
          >
            <Download size={15} /> Reportes fijos ({data.reports.length})
          </button>
          <button
            onClick={() => exportarDocumentosCSV(data, staffById)}
            className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-700 rounded px-3 py-2"
          >
            <Download size={15} /> Documentos ({(data.documentos || []).length})
          </button>
          <button
            onClick={() => exportarLocadoresCSV(data, monthKey())}
            className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-700 rounded px-3 py-2"
          >
            <Download size={15} /> Locadores ({(data.locadores || []).length})
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
          <SpellCheck2 size={14} /> Correccion automatica de escritura
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Corrige tildes y errores de tipeo mientras escribes ({totalPalabrasDiccionario()} palabras en el
          diccionario). Al pulsar espacio arregla la palabra recien escrita, y al salir del campo revisa todo el
          texto, los espacios y la mayuscula inicial.
        </p>
        <button
          onClick={alternarCorreccion}
          className={`flex items-center gap-2 text-sm rounded px-3 py-2 border ${
            correccionActiva
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-300 text-slate-600"
          }`}
        >
          <span
            className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${
              correccionActiva ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white block" />
          </span>
          {correccionActiva ? "Activada" : "Desactivada"}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
          <Database size={14} /> Copias automaticas de esta PC
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          La app guarda sola una copia por dia (las ultimas 10) dentro de este navegador. Sirven para deshacer un
          borrado por error, pero no reemplazan al respaldo descargado.
        </p>
        {copias.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded">
            Aun no hay copias. Se crea una en cuanto registres o modifiques algo.
          </p>
        ) : (
          <div className="space-y-1.5">
            {copias.map((c) => (
              <div key={c.fecha} className="flex items-center justify-between border border-slate-200 rounded px-3 py-2">
                <div>
                  <p className="text-sm text-slate-800">{fmtDate(c.fecha)}</p>
                  <p className="text-xs text-slate-500">Guardada {c.hora}</p>
                </div>
                <button
                  onClick={() => restaurar(c.fecha)}
                  className="flex items-center gap-1 text-xs border border-slate-300 text-slate-600 rounded px-2 py-1"
                >
                  <RotateCcw size={12} /> Restaurar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 border-t border-slate-200 pt-4">
        <p className="font-medium text-slate-600 mb-1">Recomendacion</p>
        <p>
          Descarga el respaldo cada viernes y guardalo en la carpeta de red de la oficina o en una USB. Si mas
          adelante varias personas necesitan ver la misma informacion desde distintas PCs, hara falta una base de
          datos compartida en vez de este almacenamiento local.
        </p>
      </div>
    </div>
  );
}
