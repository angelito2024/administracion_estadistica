import { useState } from "react";
import { X, CalendarClock, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { todayStr, fmtDate, diffDays } from "../lib/fechas";
import CampoTexto from "./CampoTexto";

const PASOS = [0, 25, 50, 75, 100];

function colorAvance(v) {
  if (v >= 100) return "bg-emerald-600";
  if (v >= 50) return "bg-pnp-verde";
  if (v > 0) return "bg-amber-400";
  return "bg-slate-300";
}

/** Barra de avance compacta para la tarjeta de la tarea. */
export function BarraAvance({ valor = 0 }) {
  const v = Math.max(0, Math.min(100, Number(valor) || 0));
  return (
    <span className="flex items-center gap-1.5 min-w-[92px]">
      <span className="flex-1 h-1.5 bg-slate-200 rounded overflow-hidden">
        <span className={`block h-full rounded ${colorAvance(v)}`} style={{ width: `${v}%` }} />
      </span>
      <span className="text-[11px] text-slate-500 w-8 text-right">{v}%</span>
    </span>
  );
}

/** Ultima observacion registrada y aviso de reprogramaciones. */
export function ResumenSeguimiento({ tarea }) {
  const [abierto, setAbierto] = useState(false);
  const historial = tarea.seguimiento || [];
  const repro = tarea.reprogramaciones || [];
  if (!historial.length && !repro.length) return null;

  const ultima = historial[historial.length - 1];

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {ultima && (
          <button
            onClick={() => setAbierto(!abierto)}
            className="flex items-start gap-1 text-xs text-slate-600 text-left hover:text-slate-900"
          >
            {abierto ? <ChevronDown size={12} className="mt-0.5 shrink-0" /> : <ChevronRight size={12} className="mt-0.5 shrink-0" />}
            <MessageSquare size={12} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              <b className="font-medium">{fmtDate(ultima.fecha)}:</b> {ultima.texto || `avance ${ultima.avance}%`}
            </span>
          </button>
        )}
        {repro.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            <CalendarClock size={11} /> Reprogramada {repro.length} {repro.length === 1 ? "vez" : "veces"}
          </span>
        )}
      </div>

      {abierto && (
        <div className="mt-1.5 ml-4 border-l-2 border-slate-200 pl-3 space-y-1.5">
          {[...historial].reverse().map((h) => (
            <div key={h.id} className="text-xs">
              <span className="text-slate-500">{fmtDate(h.fecha)}</span>
              <span className="text-slate-400"> · avance {h.avance}%</span>
              {h.texto && <p className="text-slate-700">{h.texto}</p>}
            </div>
          ))}
          {repro.map((r, i) => (
            <div key={`r${i}`} className="text-xs text-amber-800">
              <span>{fmtDate(r.fecha)}</span> · movida del {fmtDate(r.de)} al {fmtDate(r.a)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Modal para registrar el avance del dia sobre una tarea. */
export function ModalAvance({ tarea, onGuardar, onClose }) {
  const [avance, setAvance] = useState(Number(tarea.avance) || 0);
  const [texto, setTexto] = useState("");
  const [reprogramar, setReprogramar] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(tarea.dueDate || todayStr());

  const vencida = diffDays(todayStr(), tarea.dueDate) < 0;
  const sinNada = avance === (Number(tarea.avance) || 0) && !texto.trim() && !reprogramar;

  function guardar() {
    onGuardar({
      avance,
      texto: texto.trim(),
      nuevaFecha: reprogramar && nuevaFecha !== tarea.dueDate ? nuevaFecha : null,
    });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif text-lg text-slate-900">Registrar avance</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">{tarea.title}</p>

        <div className="space-y-4">
          <div>
            <span className="block text-xs text-slate-500 mb-1.5">¿En que porcentaje va?</span>
            <div className="flex gap-1.5 mb-2">
              {PASOS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAvance(p)}
                  className={`flex-1 text-xs py-1.5 rounded border ${
                    avance === p ? "bg-pnp-verde text-white border-pnp-verde" : "border-slate-300 text-slate-600"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={avance}
              onChange={(e) => setAvance(Number(e.target.value))}
              className="w-full accent-emerald-800"
            />
            <div className="mt-1">
              <BarraAvance valor={avance} />
            </div>
            {avance >= 100 && (
              <p className="text-xs text-emerald-700 mt-1.5">Al guardar, la tarea quedara marcada como completada.</p>
            )}
          </div>

          <label className="block">
            <span className="block text-xs text-slate-500 mb-1">Observacion del dia</span>
            <CampoTexto
              value={texto}
              onChange={setTexto}
              multiline
              rows={3}
              placeholder="Ej: Esta coordinando con las unidades, mañana termina de consolidar."
            />
          </label>

          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={reprogramar}
                onChange={(e) => setReprogramar(e.target.checked)}
                className="accent-emerald-800"
              />
              Reprogramar para otro dia
            </label>
            {reprogramar && (
              <div className="mt-2">
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="input"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Fecha actual: {fmtDate(tarea.dueDate)}
                  {vencida ? " (ya vencida)" : ""}. Queda registrado el cambio en el historial.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-slate-300">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={sinNada}
              className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white disabled:opacity-40"
            >
              Guardar avance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
