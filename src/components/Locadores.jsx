import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, Check, AlertTriangle, X, Phone, Mail, FileText } from "lucide-react";
import { todayStr, fmtDate, daysDiff, monthKey, monthLabel, mesesRecientes, uid } from "../lib/fechas";
import CampoTexto from "./CampoTexto";

export const ETAPAS = [
  { id: "informe", label: "Informe de actividades", corto: "Informe" },
  { id: "conformidad", label: "Conformidad del servicio", corto: "Conformidad" },
  { id: "recibo", label: "Recibo por honorarios", corto: "Recibo" },
  { id: "pago", label: "Pago efectuado", corto: "Pago" },
];

function tramiteDe(locador, mk) {
  return (locador.tramites || {})[mk] || {};
}

function etapasHechas(locador, mk) {
  const t = tramiteDe(locador, mk);
  return ETAPAS.filter((e) => t[e.id]?.hecho).length;
}

/** Locadores con algun tramite incompleto en el mes en curso. */
export function locadoresPendientes(data, mk = monthKey()) {
  return (data.locadores || []).filter((l) => l.estado !== "finalizado" && etapasHechas(l, mk) < ETAPAS.length);
}

export function contratosPorVencer(data, dias = 30) {
  return (data.locadores || []).filter((l) => {
    if (l.estado === "finalizado" || !l.fechaFin) return false;
    const d = daysDiff(l.fechaFin);
    return !isNaN(d) && d >= 0 && d <= dias;
  });
}

function locadorVacio() {
  return {
    id: null,
    nombre: "",
    dni: "",
    ruc: "",
    servicio: "",
    nroContrato: "",
    montoMensual: "",
    fechaInicio: todayStr(),
    fechaFin: "",
    telefono: "",
    correo: "",
    estado: "activo",
    tramites: {},
  };
}

export default function Locadores({ data, persist }) {
  const [form, setForm] = useState(null);
  const [mes, setMes] = useState(monthKey());
  const [verFicha, setVerFicha] = useState(null);

  const locadores = data.locadores || [];
  const meses = useMemo(() => mesesRecientes(12), []);

  function guardar() {
    if (!form.nombre.trim()) return;
    const existe = locadores.some((l) => l.id === form.id);
    const next = existe
      ? locadores.map((l) => (l.id === form.id ? form : l))
      : [...locadores, { ...form, id: uid(), tramites: {} }];
    persist({ ...data, locadores: next });
    setForm(null);
  }

  function eliminar(l) {
    if (!window.confirm(`¿Eliminar a ${l.nombre} y todo su historial de tramites?`)) return;
    persist({ ...data, locadores: locadores.filter((x) => x.id !== l.id) });
  }

  function alternarEtapa(l, etapaId) {
    const t = { ...tramiteDe(l, mes) };
    const actual = t[etapaId]?.hecho;
    t[etapaId] = actual ? { hecho: false, fecha: "" } : { hecho: true, fecha: todayStr() };
    const next = locadores.map((x) => (x.id === l.id ? { ...x, tramites: { ...(x.tramites || {}), [mes]: t } } : x));
    persist({ ...data, locadores: next });
  }

  function guardarObservacion(l, texto) {
    const t = { ...tramiteDe(l, mes), observacion: texto };
    const next = locadores.map((x) => (x.id === l.id ? { ...x, tramites: { ...(x.tramites || {}), [mes]: t } } : x));
    persist({ ...data, locadores: next });
  }

  const activos = locadores.filter((l) => l.estado !== "finalizado");
  const pendientesPorEtapa = ETAPAS.map((e) => ({
    ...e,
    n: activos.filter((l) => !tramiteDe(l, mes)[e.id]?.hecho).length,
  }));
  const montoMes = activos.reduce((s, l) => s + (parseFloat(l.montoMensual) || 0), 0);
  const montoPagado = activos
    .filter((l) => tramiteDe(l, mes).pago?.hecho)
    .reduce((s, l) => s + (parseFloat(l.montoMensual) || 0), 0);
  const porVencer = contratosPorVencer(data);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Mes del tramite:
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="input w-auto">
            {meses.map((mk) => (
              <option key={mk} value={mk}>
                {monthLabel(mk)}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setForm(locadorVacio())}
          className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5"
        >
          <Plus size={15} /> Nuevo locador
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metrica label="Locadores activos" valor={activos.length} />
        <Metrica label="Informes pendientes" valor={pendientesPorEtapa[0].n} tono={pendientesPorEtapa[0].n ? "amber" : "slate"} />
        <Metrica label="Pagos pendientes" valor={pendientesPorEtapa[3].n} tono={pendientesPorEtapa[3].n ? "amber" : "slate"} />
        <Metrica
          label={`Pagado de S/ ${montoMes.toFixed(2)}`}
          valor={`S/ ${montoPagado.toFixed(2)}`}
          tono={montoPagado >= montoMes && montoMes > 0 ? "verde" : "slate"}
        />
      </div>

      {porVencer.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 rounded p-3">
          <p className="text-sm font-medium text-amber-900 flex items-center gap-1.5 mb-1">
            <AlertTriangle size={15} /> {porVencer.length} contrato(s) por vencer en los proximos 30 dias
          </p>
          {porVencer.map((l) => (
            <p key={l.id} className="text-xs text-amber-800">
              {l.nombre} — vence el {fmtDate(l.fechaFin)} ({daysDiff(l.fechaFin)} dia/s)
            </p>
          ))}
        </div>
      )}

      {locadores.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center border border-dashed border-slate-200 rounded">
          Registra a los locadores de servicios para llevar mes a mes su tramite: informe de actividades,
          conformidad, recibo por honorarios y pago.
        </p>
      ) : (
        <div className="space-y-3">
          {locadores.map((l) => (
            <FilaLocador
              key={`${l.id}-${mes}`}
              l={l}
              mes={mes}
              onEtapa={(e) => alternarEtapa(l, e)}
              onEditar={() => setForm({ ...locadorVacio(), ...l })}
              onEliminar={() => eliminar(l)}
              onFicha={() => setVerFicha(l)}
              onObservacion={(t) => guardarObservacion(l, t)}
            />
          ))}
        </div>
      )}

      {form && (
        <Modal onClose={() => setForm(null)} title={form.id ? "Editar locador" : "Nuevo locador de servicios"}>
          <div className="space-y-3">
            <Campo label="Nombre completo">
              <CampoTexto value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="DNI">
                <input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} className="input" />
              </Campo>
              <Campo label="RUC">
                <input value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} className="input" />
              </Campo>
            </div>
            <Campo label="Servicio contratado">
              <CampoTexto
                value={form.servicio}
                onChange={(v) => setForm({ ...form, servicio: v })}
                placeholder="Ej: Apoyo en digitacion de informacion estadistica"
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="N° de contrato">
                <input
                  value={form.nroContrato}
                  onChange={(e) => setForm({ ...form, nroContrato: e.target.value })}
                  className="input"
                />
              </Campo>
              <Campo label="Monto mensual (S/)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.montoMensual}
                  onChange={(e) => setForm({ ...form, montoMensual: e.target.value })}
                  className="input"
                />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Inicio de contrato">
                <input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                  className="input"
                />
              </Campo>
              <Campo label="Fin de contrato">
                <input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                  className="input"
                />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Telefono">
                <input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="input"
                />
              </Campo>
              <Campo label="Correo">
                <input
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  className="input"
                />
              </Campo>
            </div>
            <Campo label="Situacion">
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="input">
                <option value="activo">Activo</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </Campo>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">
                Cancelar
              </button>
              <button onClick={guardar} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {verFicha && <FichaLocador l={verFicha} onClose={() => setVerFicha(null)} />}
    </div>
  );
}

function FilaLocador({ l, mes, onEtapa, onEditar, onEliminar, onFicha, onObservacion }) {
  const t = tramiteDe(l, mes);
  const hechas = etapasHechas(l, mes);
  const completo = hechas === ETAPAS.length;
  const finalizado = l.estado === "finalizado";
  const [obs, setObs] = useState(t.observacion || "");

  return (
    <div className={`border rounded p-3 ${finalizado ? "border-slate-200 bg-slate-50/60" : completo ? "border-emerald-200" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {l.nombre}
            {finalizado && <span className="ml-2 text-xs text-slate-500">(contrato finalizado)</span>}
          </p>
          <p className="text-xs text-slate-500">{l.servicio || "Servicio no especificado"}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            {l.nroContrato && <span>Contrato {l.nroContrato}</span>}
            {l.dni && <span>DNI {l.dni}</span>}
            {l.ruc && <span>RUC {l.ruc}</span>}
            {l.montoMensual && <span>S/ {parseFloat(l.montoMensual).toFixed(2)} al mes</span>}
            {l.fechaFin && <span>Vence {fmtDate(l.fechaFin)}</span>}
            {l.telefono && (
              <span className="flex items-center gap-1">
                <Phone size={11} />
                {l.telefono}
              </span>
            )}
            {l.correo && (
              <span className="flex items-center gap-1">
                <Mail size={11} />
                {l.correo}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded border ${completo ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
            {hechas}/{ETAPAS.length} etapas
          </span>
          <button onClick={onFicha} className="text-slate-400 hover:text-slate-700" title="Ver historial">
            <FileText size={14} />
          </button>
          <button onClick={onEditar} className="text-slate-400 hover:text-slate-700">
            <Pencil size={14} />
          </button>
          <button onClick={onEliminar} className="text-slate-400 hover:text-rose-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {ETAPAS.map((e, i) => {
          const hecho = t[e.id]?.hecho;
          return (
            <button
              key={e.id}
              onClick={() => onEtapa(e.id)}
              className={`text-left border rounded px-2 py-1.5 transition-colors ${
                hecho ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    hecho ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"
                  }`}
                >
                  {hecho && <Check size={11} />}
                </span>
                <span className={`text-xs ${hecho ? "text-emerald-900" : "text-slate-600"}`}>
                  {i + 1}. {e.corto}
                </span>
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 pl-5">
                {hecho ? fmtDate(t[e.id].fecha) : "pendiente"}
              </span>
            </button>
          );
        })}
      </div>

      <input
        value={obs}
        onChange={(ev) => setObs(ev.target.value)}
        onBlur={() => obs !== (t.observacion || "") && onObservacion(obs)}
        placeholder="Observacion del mes (opcional)"
        className="input mt-2 text-xs"
      />
    </div>
  );
}

function FichaLocador({ l, onClose }) {
  const meses = mesesRecientes(12);
  return (
    <Modal onClose={onClose} title={`Historial de tramites — ${l.nombre}`}>
      <div className="space-y-1">
        <div className="grid grid-cols-5 gap-1 text-[10px] text-slate-500 pb-1 border-b border-slate-200">
          <span>Mes</span>
          {ETAPAS.map((e) => (
            <span key={e.id} className="text-center">
              {e.corto}
            </span>
          ))}
        </div>
        {meses.map((mk) => {
          const t = tramiteDe(l, mk);
          const alguno = ETAPAS.some((e) => t[e.id]?.hecho);
          return (
            <div key={mk} className={`grid grid-cols-5 gap-1 items-center py-1 ${alguno ? "" : "opacity-50"}`}>
              <span className="text-xs text-slate-700">{monthLabel(mk)}</span>
              {ETAPAS.map((e) => (
                <span key={e.id} className="flex justify-center">
                  {t[e.id]?.hecho ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check size={10} />
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-slate-200" />
                  )}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function Metrica({ label, valor, tono = "slate" }) {
  const tonos = {
    slate: "bg-slate-50 text-slate-900",
    amber: "bg-amber-50 text-amber-800",
    verde: "bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`rounded p-3 ${tonos[tono]}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-serif">{valor}</p>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
