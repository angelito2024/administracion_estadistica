import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, MailCheck, AlertTriangle, Clock, Search, X } from "lucide-react";
import { todayStr, fmtDate, daysDiff, sumarDias, uid, monthKey, limpiarRegistro } from "../lib/fechas";
import CampoTexto from "./CampoTexto";

export const TIPOS_DOC = ["Oficio", "Memorando", "Informe", "Carta", "Solicitud", "Correo electronico", "Resolucion", "Otro"];

const ESTADOS = {
  pendiente: { label: "Por responder", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  en_proceso: { label: "En elaboracion", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  respondido: { label: "Respondido", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

/** Situacion de plazo de un documento sin responder. */
export function situacionPlazo(doc) {
  if (doc.estado === "respondido") return { clave: "ok", dias: null };
  const d = daysDiff(doc.fechaLimite);
  if (isNaN(d)) return { clave: "sinplazo", dias: null };
  if (d < 0) return { clave: "vencido", dias: Math.abs(d) };
  if (d <= 3) return { clave: "porvencer", dias: d };
  return { clave: "atiempo", dias: d };
}

export function documentosVencidos(data) {
  return (data.documentos || []).filter((d) => situacionPlazo(d).clave === "vencido");
}

export function documentosPorResponder(data) {
  return (data.documentos || []).filter((d) => d.estado !== "respondido");
}

function docVacio() {
  return {
    id: null,
    nro: "",
    tipo: "Oficio",
    fechaRecepcion: todayStr(),
    remitente: "",
    asunto: "",
    plazoDias: 5,
    fechaLimite: sumarDias(todayStr(), 5),
    responsable: "",
    estado: "pendiente",
    nroRespuesta: "",
    fechaRespuesta: "",
    notas: "",
  };
}

export default function Documentos({ data, persist, staffById }) {
  const [form, setForm] = useState(null);
  const [respuesta, setRespuesta] = useState(null);
  const [filtro, setFiltro] = useState("porresponder");
  const [q, setQ] = useState("");

  const documentos = data.documentos || [];

  function guardar() {
    if (!form.asunto.trim()) return;
    const existe = documentos.some((d) => d.id === form.id);
    const next = existe
      ? documentos.map((d) => (d.id === form.id ? limpiarRegistro(form) : d))
      : [...documentos, { ...limpiarRegistro(form), id: uid(), registradoEl: todayStr() }];
    persist({ ...data, documentos: next });
    setForm(null);
  }

  function eliminar(d) {
    if (!window.confirm(`¿Eliminar el registro "${d.asunto}"?`)) return;
    persist({ ...data, documentos: documentos.filter((x) => x.id !== d.id) });
  }

  function guardarRespuesta() {
    const r = respuesta;
    const next = documentos.map((d) =>
      d.id === r.id
        ? { ...d, estado: "respondido", nroRespuesta: r.nroRespuesta, fechaRespuesta: r.fechaRespuesta, notas: r.notas }
        : d
    );
    persist({ ...data, documentos: next });
    setRespuesta(null);
  }

  function cambiarEstado(d, estado) {
    const next = documentos.map((x) =>
      x.id === d.id
        ? estado === "respondido"
          ? { ...x, estado, fechaRespuesta: x.fechaRespuesta || todayStr() }
          : { ...x, estado }
        : x
    );
    persist({ ...data, documentos: next });
  }

  function actualizarPlazo(campos) {
    const base = { ...form, ...campos };
    setForm({ ...base, fechaLimite: sumarDias(base.fechaRecepcion, base.plazoDias) });
  }

  const vencidos = documentos.filter((d) => situacionPlazo(d).clave === "vencido");
  const porVencer = documentos.filter((d) => situacionPlazo(d).clave === "porvencer");
  const porResponder = documentos.filter((d) => d.estado !== "respondido");
  const respondidosMes = documentos.filter(
    (d) => d.estado === "respondido" && (d.fechaRespuesta || "").slice(0, 7) === monthKey()
  );

  const lista = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return documentos
      .filter((d) => {
        if (filtro === "porresponder") return d.estado !== "respondido";
        if (filtro === "vencidos") return situacionPlazo(d).clave === "vencido";
        if (filtro === "respondidos") return d.estado === "respondido";
        return true;
      })
      .filter((d) => !texto || [d.nro, d.asunto, d.remitente, d.tipo, d.nroRespuesta].join(" ").toLowerCase().includes(texto))
      .sort((a, b) => (a.fechaLimite || "9999").localeCompare(b.fechaLimite || "9999"));
  }, [documentos, filtro, q]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metrica label="Por responder" valor={porResponder.length} tono={porResponder.length ? "amber" : "slate"} />
        <Metrica label="Con plazo vencido" valor={vencidos.length} tono={vencidos.length ? "rose" : "slate"} />
        <Metrica label="Vencen en 3 dias" valor={porVencer.length} tono={porVencer.length ? "amber" : "slate"} />
        <Metrica label="Respondidos este mes" valor={respondidosMes.length} tono="slate" />
      </div>

      {vencidos.length > 0 && (
        <div className="border border-rose-300 bg-rose-50 rounded p-3">
          <p className="text-sm font-medium text-rose-900 flex items-center gap-1.5 mb-2">
            <AlertTriangle size={15} /> Verificacion: {vencidos.length} documento(s) sin respuesta fuera de plazo
          </p>
          <div className="space-y-1">
            {vencidos.slice(0, 5).map((d) => (
              <p key={d.id} className="text-xs text-rose-800">
                {d.tipo} {d.nro || "s/n"} — {d.asunto} · vencio hace {situacionPlazo(d).dias} dia(s)
                {d.responsable && staffById[d.responsable] ? ` · ${staffById[d.responsable].name}` : ""}
              </p>
            ))}
            {vencidos.length > 5 && <p className="text-xs text-rose-700">y {vencidos.length - 5} mas…</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {[
            { id: "porresponder", label: "Por responder" },
            { id: "vencidos", label: "Vencidos" },
            { id: "respondidos", label: "Respondidos" },
            { id: "todos", label: "Todos" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                filtro === f.id ? "bg-pnp-verde text-white border-pnp-verde" : "border-slate-300 text-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar N°, asunto o remitente"
              className="input pl-7 w-52"
            />
          </div>
          <button
            onClick={() => setForm(docVacio())}
            className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5 whitespace-nowrap"
          >
            <Plus size={15} /> Registrar documento
          </button>
        </div>
      </div>

      {documentos.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center border border-dashed border-slate-200 rounded">
          Aqui se registran los documentos que llegan a la oficina y necesitan respuesta (oficios, memorandos,
          solicitudes). La app calcula el plazo y te avisa cual esta por vencer o vencido.
        </p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No hay documentos en esta vista.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((d) => (
            <FilaDocumento
              key={d.id}
              d={d}
              staff={staffById[d.responsable]}
              onEditar={() => setForm({ ...docVacio(), ...d })}
              onEliminar={() => eliminar(d)}
              onResponder={() =>
                setRespuesta({
                  id: d.id,
                  nroRespuesta: d.nroRespuesta || "",
                  fechaRespuesta: d.fechaRespuesta || todayStr(),
                  notas: d.notas || "",
                  asunto: d.asunto,
                })
              }
              onEstado={(e) => cambiarEstado(d, e)}
            />
          ))}
        </div>
      )}

      {form && (
        <Modal onClose={() => setForm(null)} title={form.id ? "Editar documento" : "Registrar documento recibido"}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tipo">
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input">
                  {TIPOS_DOC.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="N° de documento">
                <input
                  value={form.nro}
                  onChange={(e) => setForm({ ...form, nro: e.target.value })}
                  className="input"
                  placeholder="Ej: 145-2026-DIRSAPOL"
                />
              </Campo>
            </div>
            <Campo label="Asunto">
              <CampoTexto
                value={form.asunto}
                onChange={(v) => setForm({ ...form, asunto: v })}
                placeholder="Ej: Solicita informacion estadistica de atenciones"
              />
            </Campo>
            <Campo label="Remitente (quien lo envia)">
              <CampoTexto
                value={form.remitente}
                onChange={(v) => setForm({ ...form, remitente: v })}
                placeholder="Ej: Direccion de Recursos Humanos"
              />
            </Campo>
            <div className="grid grid-cols-3 gap-3">
              <Campo label="Fecha de recepcion">
                <input
                  type="date"
                  value={form.fechaRecepcion}
                  onChange={(e) => actualizarPlazo({ fechaRecepcion: e.target.value })}
                  className="input"
                />
              </Campo>
              <Campo label="Plazo (dias)">
                <input
                  type="number"
                  min={0}
                  value={form.plazoDias}
                  onChange={(e) => actualizarPlazo({ plazoDias: parseInt(e.target.value || "0", 10) })}
                  className="input"
                />
              </Campo>
              <Campo label="Responder hasta">
                <input
                  type="date"
                  value={form.fechaLimite}
                  onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })}
                  className="input"
                />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Responsable de responder">
                <select
                  value={form.responsable}
                  onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                  className="input"
                >
                  <option value="">— Sin asignar —</option>
                  {data.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Estado">
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="input">
                  {Object.entries(ESTADOS).map(([id, e]) => (
                    <option key={id} value={id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo label="Observaciones">
              <CampoTexto value={form.notas} onChange={(v) => setForm({ ...form, notas: v })} multiline rows={2} />
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

      {respuesta && (
        <Modal onClose={() => setRespuesta(null)} title="Registrar la respuesta enviada">
          <div className="space-y-3">
            <p className="text-xs text-slate-500">{respuesta.asunto}</p>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="N° del documento de respuesta">
                <input
                  value={respuesta.nroRespuesta}
                  onChange={(e) => setRespuesta({ ...respuesta, nroRespuesta: e.target.value })}
                  className="input"
                  placeholder="Ej: Oficio 302-2026"
                />
              </Campo>
              <Campo label="Fecha de respuesta">
                <input
                  type="date"
                  value={respuesta.fechaRespuesta}
                  onChange={(e) => setRespuesta({ ...respuesta, fechaRespuesta: e.target.value })}
                  className="input"
                />
              </Campo>
            </div>
            <Campo label="Observaciones">
              <CampoTexto
                value={respuesta.notas}
                onChange={(v) => setRespuesta({ ...respuesta, notas: v })}
                multiline
                rows={2}
              />
            </Campo>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setRespuesta(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">
                Cancelar
              </button>
              <button onClick={guardarRespuesta} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">
                Marcar como respondido
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FilaDocumento({ d, staff, onEditar, onEliminar, onResponder, onEstado }) {
  const sit = situacionPlazo(d);
  const borde =
    sit.clave === "vencido" ? "border-rose-300 bg-rose-50/40" : sit.clave === "porvencer" ? "border-amber-300 bg-amber-50/40" : "border-slate-200";
  const est = ESTADOS[d.estado] || ESTADOS.pendiente;

  return (
    <div className={`border rounded p-3 ${borde}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">
              {d.tipo} {d.nro || "s/n"}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${est.cls}`}>{est.label}</span>
          </div>
          <p className="text-sm text-slate-900 font-medium mt-0.5">{d.asunto}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            {d.remitente && <span>De: {d.remitente}</span>}
            <span>Recibido {fmtDate(d.fechaRecepcion)}</span>
            {d.estado !== "respondido" ? (
              <span
                className={`flex items-center gap-1 ${
                  sit.clave === "vencido" ? "text-rose-700 font-medium" : sit.clave === "porvencer" ? "text-amber-700" : ""
                }`}
              >
                <Clock size={11} />
                {sit.clave === "sinplazo"
                  ? "Sin plazo definido"
                  : sit.clave === "vencido"
                  ? `Vencio hace ${sit.dias} dia(s) — ${fmtDate(d.fechaLimite)}`
                  : `Responder hasta ${fmtDate(d.fechaLimite)} (${sit.dias} dia/s)`}
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1">
                <MailCheck size={11} /> Respondido {d.nroRespuesta ? `con ${d.nroRespuesta}` : ""}{" "}
                {d.fechaRespuesta ? `el ${fmtDate(d.fechaRespuesta)}` : ""}
              </span>
            )}
            {staff && <span>Responsable: {staff.name}</span>}
          </div>
          {d.notas && <p className="text-xs text-slate-500 mt-1">{d.notas}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {d.estado !== "respondido" ? (
            <button
              onClick={onResponder}
              className="flex items-center gap-1 text-xs bg-pnp-verde text-white rounded px-2 py-1 whitespace-nowrap"
            >
              <MailCheck size={12} /> Registrar respuesta
            </button>
          ) : (
            <button
              onClick={() => onEstado("pendiente")}
              className="text-xs border border-slate-300 text-slate-600 rounded px-2 py-1 whitespace-nowrap"
            >
              Reabrir
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onEditar} className="text-slate-400 hover:text-slate-700">
              <Pencil size={14} />
            </button>
            <button onClick={onEliminar} className="text-slate-400 hover:text-rose-600">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metrica({ label, valor, tono }) {
  const tonos = {
    slate: "bg-slate-50 text-slate-900",
    rose: "bg-rose-50 text-rose-800",
    amber: "bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded p-3 ${tonos[tono]}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-serif">{valor}</p>
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
