import { useState, useMemo } from "react";
import {
  Plus, Trash2, Pencil, X, Phone, Mail, AlertTriangle, FileText, CheckCircle2,
  ChevronRight, Download, CircleDollarSign, Clock, Undo2,
} from "lucide-react";
import { todayStr, fmtDate, diffDays, monthKey, monthLabel, uid } from "../lib/fechas";
import CampoTexto from "./CampoTexto";
import {
  RECORRIDO_CONTRATO, RECORRIDO_PAGO, REQUISITOS_CONTRATO, REQUISITOS_PAGO,
  expedienteContrato, expedientePago, mesesDelContrato, moverExpediente, observarExpediente,
  subsanarExpediente, cerrarExpediente, diasEnPaso, revisarLocador, locadorVacio,
  locadoresIniciales, locadoresActivos, contratosPorVencer, locadoresPendientes,
} from "../lib/locadores";

export { locadoresPendientes, contratosPorVencer };

const soles = (n) => `S/ ${(parseFloat(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

/* ---------- piezas visuales ---------- */
function Metrica({ label, valor, tono = "slate" }) {
  const tonos = {
    slate: "border-slate-200 text-slate-800",
    amber: "border-amber-300 bg-amber-50 text-amber-900",
    verde: "border-emerald-300 bg-emerald-50 text-emerald-900",
    rose: "border-rose-300 bg-rose-50 text-rose-900",
  };
  return (
    <div className={`border rounded p-3 ${tonos[tono]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-xl font-serif">{valor}</p>
    </div>
  );
}

/** Linea de pasos por las areas: se hace clic en un area para mover el expediente. */
function Recorrido({ pasos, exp, onMover, onObservar, onSubsanar, onCerrar, requisitos, titulo }) {
  const dias = diasEnPaso(exp);
  const terminado = !!exp.finalizado;
  const obs = exp.observado;

  return (
    <div className="border border-slate-200 rounded p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <h4 className="text-sm font-medium text-slate-700">{titulo}</h4>
        {terminado ? (
          <span className="flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            <CheckCircle2 size={11} /> Finalizado el {fmtDate(exp.finalizado)}
          </span>
        ) : (
          <span className="text-xs text-slate-500">
            {exp.iniciado ? `En ${pasos[exp.paso]}` : "Sin iniciar"}
            {dias !== null && exp.iniciado && ` · ${dias} dia(s) aqui`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-2">
        {pasos.map((nombre, i) => {
          const hecho = exp.iniciado && i < exp.paso;
          const actual = exp.iniciado && i === exp.paso && !terminado;
          return (
            <span key={i} className="flex items-center">
              <button
                onClick={() => onMover(i)}
                disabled={terminado}
                title={`Mover el expediente a: ${nombre}`}
                className={`text-[11px] rounded px-1.5 py-1 border text-left leading-tight disabled:opacity-60 ${
                  actual
                    ? obs
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-pnp-verde text-white border-pnp-verde"
                    : hecho
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}
              >
                <span className="opacity-60 mr-1">{i + 1}</span>
                {nombre}
              </button>
              {i < pasos.length - 1 && <ChevronRight size={11} className="text-slate-300 mx-0.5" />}
            </span>
          );
        })}
      </div>

      {obs && (
        <div className="text-xs bg-rose-50 border border-rose-200 rounded p-2 text-rose-900 mb-2">
          <p className="font-medium flex items-center gap-1">
            <AlertTriangle size={12} /> Observado el {fmtDate(obs.fecha)} en {pasos[obs.paso]}
          </p>
          <p className="mt-0.5">{obs.motivo}</p>
          <button onClick={onSubsanar} className="mt-1.5 flex items-center gap-1 text-xs border border-rose-300 rounded px-2 py-1 hover:bg-rose-100">
            <Undo2 size={12} /> Subsanado, devolver a Ejecucion Contractual
          </button>
        </div>
      )}

      {!terminado && (
        <div className="flex gap-2 flex-wrap">
          {!obs && (
            <button
              onClick={onObservar}
              className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-600 hover:border-rose-400 hover:text-rose-700"
            >
              Marcar observado
            </button>
          )}
          {exp.iniciado && exp.paso === pasos.length - 1 && (
            <button
              onClick={onCerrar}
              className="flex items-center gap-1 text-xs border border-emerald-300 text-emerald-800 rounded px-2 py-1 hover:bg-emerald-50"
            >
              <CheckCircle2 size={12} /> Dar por finalizado
            </button>
          )}
        </div>
      )}

      {exp.historial?.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
            Ver recorrido ({exp.historial.length} movimiento/s)
          </summary>
          <div className="mt-1.5 border-l-2 border-slate-200 pl-3 space-y-1">
            {[...exp.historial].reverse().map((h, i) => (
              <p key={i} className="text-xs text-slate-600">
                <span className="text-slate-400">{fmtDate(h.fecha)}</span> · {pasos[h.paso]}
                {h.nota && <span className={h.nota.startsWith("OBSERVADO") ? "text-rose-700" : "text-slate-500"}> — {h.nota}</span>}
              </p>
            ))}
          </div>
        </details>
      )}

      <p className="text-[11px] text-slate-400 mt-2 leading-snug">{requisitos}</p>
    </div>
  );
}

/* ---------- pantalla ---------- */
export default function Locadores({ data, persist }) {
  const [form, setForm] = useState(null);
  const [mes, setMes] = useState(monthKey());
  const [abierto, setAbierto] = useState(null);

  const locadores = data.locadores || [];
  const activos = locadoresActivos(data);

  const avisosPorId = useMemo(() => {
    const m = {};
    locadores.forEach((l) => (m[l.id] = revisarLocador(l, locadores)));
    return m;
  }, [locadores]);
  const totalAvisos = Object.values(avisosPorId).reduce((s, a) => s + a.length, 0);

  const mesesVisibles = useMemo(() => {
    const set = new Set(locadores.flatMap(mesesDelContrato));
    set.add(monthKey());
    return [...set].sort().reverse();
  }, [locadores]);

  function guardarLocadores(next) {
    persist({ ...data, locadores: next });
  }

  function actualizar(id, cambios) {
    guardarLocadores(locadores.map((l) => (l.id === id ? { ...l, ...cambios } : l)));
  }

  function guardar() {
    if (!form.nombre.trim()) return;
    const existe = locadores.some((l) => l.id === form.id);
    guardarLocadores(existe ? locadores.map((l) => (l.id === form.id ? form : l)) : [...locadores, { ...form, id: uid() }]);
    setForm(null);
  }

  function eliminar(l) {
    if (!window.confirm(`¿Eliminar a ${l.nombre} y todo su historial de contrato y pagos?`)) return;
    guardarLocadores(locadores.filter((x) => x.id !== l.id));
  }

  function cargarIniciales() {
    if (!window.confirm("Se cargaran los 6 locadores de los archivos CONTRATO.xlsx y PAGOS.xlsx. ¿Continuar?")) return;
    guardarLocadores([...locadores, ...locadoresIniciales()]);
  }

  /* --- acciones sobre expedientes --- */
  function cambiarContrato(l, fn) {
    actualizar(l.id, { contrato: fn(expedienteContrato(l)) });
  }
  function cambiarPago(l, mk, fn) {
    actualizar(l.id, { pagos: { ...(l.pagos || {}), [mk]: fn(expedientePago(l, mk)) } });
  }
  function pedirMotivo(fn) {
    const motivo = window.prompt("¿Por que fue observado el expediente?");
    if (motivo && motivo.trim()) fn(motivo.trim());
  }

  /* --- cifras del mes --- */
  const delMes = activos.filter((l) => mesesDelContrato(l).includes(mes));
  const montoMes = delMes.reduce((s, l) => s + (parseFloat(l.montoMensual) || 0), 0);
  const pagados = delMes.filter((l) => expedientePago(l, mes).finalizado);
  const montoPagado = pagados.reduce((s, l) => s + (parseFloat(l.montoMensual) || 0), 0);
  const porVencer = contratosPorVencer(data);
  const observados = delMes.filter((l) => expedientePago(l, mes).observado || expedienteContrato(l).observado);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Mes del pago:
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="input w-auto">
            {mesesVisibles.map((mk) => (
              <option key={mk} value={mk}>{monthLabel(mk)}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          {locadores.length === 0 && (
            <button onClick={cargarIniciales} className="flex items-center gap-1 text-sm border border-slate-300 rounded px-3 py-1.5 text-slate-700 hover:border-pnp-verde">
              <Download size={15} /> Cargar los 6 del Excel
            </button>
          )}
          <button onClick={() => setForm(locadorVacio())} className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5">
            <Plus size={15} /> Nuevo locador
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metrica label="Locadores activos" valor={activos.length} />
        <Metrica label={`Pagos de ${monthLabel(mes)}`} valor={`${pagados.length} de ${delMes.length}`} tono={delMes.length && pagados.length === delMes.length ? "verde" : "amber"} />
        <Metrica label={`Pagado de ${soles(montoMes)}`} valor={soles(montoPagado)} tono={montoPagado >= montoMes && montoMes > 0 ? "verde" : "slate"} />
        <Metrica label="Expedientes observados" valor={observados.length} tono={observados.length ? "rose" : "slate"} />
      </div>

      {totalAvisos > 0 && (
        <div className="border border-rose-300 bg-rose-50 rounded p-3">
          <p className="text-sm font-medium text-rose-900 flex items-center gap-1.5 mb-1">
            <AlertTriangle size={15} /> {totalAvisos} dato(s) por revisar, vienen asi de los archivos
          </p>
          {locadores.map((l) =>
            (avisosPorId[l.id] || []).map((a, i) => (
              <p key={`${l.id}${i}`} className="text-xs text-rose-800">
                <b className="font-medium">{l.nombre}:</b> {a.texto}
              </p>
            ))
          )}
        </div>
      )}

      {porVencer.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 rounded p-3">
          <p className="text-sm font-medium text-amber-900 flex items-center gap-1.5 mb-1">
            <Clock size={15} /> {porVencer.length} contrato(s) vencen en los proximos 30 dias
          </p>
          {porVencer.map((l) => (
            <p key={l.id} className="text-xs text-amber-800">
              {l.nombre} — vence el {fmtDate(l.fechaFin)} (faltan {diffDays(todayStr(), l.fechaFin)} dia/s)
            </p>
          ))}
        </div>
      )}

      {locadores.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">
          <p>Aun no hay locadores registrados.</p>
          <p className="mt-1">Usa <b>Cargar los 6 del Excel</b> para empezar con los datos que ya tienes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {locadores.map((l) => {
            const avisos = avisosPorId[l.id] || [];
            const enMes = mesesDelContrato(l).includes(mes);
            const expC = expedienteContrato(l);
            const expP = expedientePago(l, mes);
            const esteAbierto = abierto === l.id;
            return (
              <div key={l.id} className={`border rounded ${avisos.length ? "border-rose-200" : "border-slate-200"}`}>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {l.nroOrden && <span className="text-xs text-slate-400">N° {l.nroOrden}</span>}
                        <p className="text-sm font-medium text-slate-900">{l.nombre}</p>
                        <span className="text-xs text-slate-500">{l.cargo}</span>
                        {l.estado === "finalizado" && (
                          <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">Finalizado</span>
                        )}
                        {avisos.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                            <AlertTriangle size={11} /> {avisos.length} dato(s) por revisar
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <span>DNI {l.dni || "—"}</span>
                        <span>RUC {l.ruc || "—"}</span>
                        {l.celular && <span className="flex items-center gap-1"><Phone size={11} />{l.celular}</span>}
                        {l.correo && <span className="flex items-center gap-1"><Mail size={11} />{l.correo}</span>}
                        <span className="flex items-center gap-1"><CircleDollarSign size={11} />{soles(l.montoMensual)}/mes</span>
                        <span>{fmtDate(l.fechaInicio)} al {fmtDate(l.fechaFin)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                        <span className="text-slate-500">SGD {l.sgd || "—"}</span>
                        <span className="text-slate-500">O/S {l.ordenServicio || "—"}</span>
                        <span className="text-slate-500">SIAF {l.siaf || "—"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setAbierto(esteAbierto ? null : l.id)} className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-600 hover:border-pnp-verde hover:text-pnp-verde">
                        {esteAbierto ? "Ocultar" : "Ver tramites"}
                      </button>
                      <button onClick={() => setForm({ ...locadorVacio(), ...l })} className="text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                      <button onClick={() => eliminar(l)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {!esteAbierto && (
                    <div className="flex gap-3 mt-2 text-xs flex-wrap">
                      <span className="text-slate-500">
                        Contrato: <b className="text-slate-700">{expC.finalizado ? "Finalizado" : expC.iniciado ? RECORRIDO_CONTRATO[expC.paso] : "Sin iniciar"}</b>
                      </span>
                      <span className="text-slate-500">
                        Pago {monthLabel(mes)}:{" "}
                        <b className={expP.finalizado ? "text-emerald-700" : expP.observado ? "text-rose-700" : "text-slate-700"}>
                          {!enMes ? "fuera del contrato" : expP.finalizado ? "Pagado" : expP.iniciado ? RECORRIDO_PAGO[expP.paso] : "Sin iniciar"}
                        </b>
                      </span>
                    </div>
                  )}
                </div>

                {esteAbierto && (
                  <div className="border-t border-slate-200 p-3 space-y-3 bg-slate-50/50">
                    {avisos.length > 0 && (
                      <div className="text-xs bg-rose-50 border border-rose-200 rounded p-2 text-rose-900">
                        {avisos.map((a, i) => <p key={i}>• {a.texto}</p>)}
                      </div>
                    )}
                    {l.descripcionTdr && (
                      <p className="text-xs text-slate-600 flex items-start gap-1.5">
                        <FileText size={12} className="mt-0.5 shrink-0 text-slate-400" /> {l.descripcionTdr}
                      </p>
                    )}

                    <Recorrido
                      titulo="Expediente de contrato"
                      pasos={RECORRIDO_CONTRATO}
                      exp={expC}
                      requisitos={REQUISITOS_CONTRATO}
                      onMover={(i) => cambiarContrato(l, (e) => moverExpediente(e, i))}
                      onObservar={() => pedirMotivo((m) => cambiarContrato(l, (e) => observarExpediente(e, m)))}
                      onSubsanar={() => cambiarContrato(l, subsanarExpediente)}
                      onCerrar={() => cambiarContrato(l, (e) => cerrarExpediente(e, "Contrato suscrito"))}
                    />

                    {enMes ? (
                      <Recorrido
                        titulo={`Expediente de pago — ${monthLabel(mes)} (${soles(l.montoMensual)})`}
                        pasos={RECORRIDO_PAGO}
                        exp={expP}
                        requisitos={REQUISITOS_PAGO}
                        onMover={(i) => cambiarPago(l, mes, (e) => moverExpediente(e, i))}
                        onObservar={() => pedirMotivo((m) => cambiarPago(l, mes, (e) => observarExpediente(e, m)))}
                        onSubsanar={() => cambiarPago(l, mes, subsanarExpediente)}
                        onCerrar={() => cambiarPago(l, mes, (e) => cerrarExpediente(e, "Pago efectuado"))}
                      />
                    ) : (
                      <p className="text-xs text-slate-400 border border-slate-200 rounded p-3">
                        {monthLabel(mes)} esta fuera del periodo del contrato ({fmtDate(l.fechaInicio)} al {fmtDate(l.fechaFin)}).
                      </p>
                    )}

                    <div className="flex gap-2 flex-wrap text-xs">
                      {mesesDelContrato(l).map((mk) => {
                        const e = expedientePago(l, mk);
                        return (
                          <button
                            key={mk}
                            onClick={() => setMes(mk)}
                            className={`rounded px-2 py-1 border ${
                              mk === mes ? "border-pnp-verde text-pnp-verde bg-emerald-50"
                              : e.finalizado ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : e.observado ? "border-rose-200 text-rose-700 bg-rose-50"
                              : "border-slate-200 text-slate-500"
                            }`}
                          >
                            {monthLabel(mk)} {e.finalizado ? "· pagado" : e.iniciado ? "· en tramite" : "· sin iniciar"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {form && <FormularioLocador form={form} setForm={setForm} onGuardar={guardar} otros={locadores} />}
    </div>
  );
}

/* ---------- formulario ---------- */
function Campo({ label, children, ancho = "" }) {
  return (
    <label className={`block ${ancho}`}>
      <span className="block text-xs text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function FormularioLocador({ form, setForm, onGuardar, otros }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const avisos = revisarLocador(form, otros);

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={() => setForm(null)}>
      <div className="bg-white rounded-lg p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-slate-900">{form.id ? "Editar locador" : "Nuevo locador"}</h3>
          <button onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Datos del locador</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Apellidos y nombres">
              <CampoTexto value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
            </Campo>
            <Campo label="Cargo">
              <CampoTexto value={form.cargo} onChange={(v) => setForm({ ...form, cargo: v })} />
            </Campo>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <Campo label="DNI"><input value={form.dni} onChange={set("dni")} className="input" maxLength={8} /></Campo>
            <Campo label="RUC"><input value={form.ruc} onChange={set("ruc")} className="input" maxLength={11} /></Campo>
            <Campo label="Celular"><input value={form.celular} onChange={set("celular")} className="input" /></Campo>
            <Campo label="Correo"><input value={form.correo} onChange={set("correo")} className="input" /></Campo>
          </div>

          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide pt-2">Contrato</p>
          <div className="grid sm:grid-cols-4 gap-3">
            <Campo label="N° de orden"><input value={form.nroOrden} onChange={set("nroOrden")} className="input" /></Campo>
            <Campo label="SGD" ancho="sm:col-span-2"><input value={form.sgd} onChange={set("sgd")} className="input" /></Campo>
            <Campo label="Orden de servicio"><input value={form.ordenServicio} onChange={set("ordenServicio")} className="input" /></Campo>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <Campo label="N° SIAF"><input value={form.siaf} onChange={set("siaf")} className="input" /></Campo>
            <Campo label="Monto mensual S/"><input type="number" value={form.montoMensual} onChange={set("montoMensual")} className="input" /></Campo>
            <Campo label="Meses"><input type="number" min={1} value={form.mesesContrato} onChange={set("mesesContrato")} className="input" /></Campo>
            <Campo label="Remuneracion total S/"><input type="number" value={form.remuneracion} onChange={set("remuneracion")} className="input" /></Campo>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Campo label="Inicio"><input type="date" value={form.fechaInicio} onChange={set("fechaInicio")} className="input" /></Campo>
            <Campo label="Fin"><input type="date" value={form.fechaFin} onChange={set("fechaFin")} className="input" /></Campo>
            <Campo label="Estado">
              <select value={form.estado} onChange={set("estado")} className="input">
                <option value="activo">Activo</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </Campo>
          </div>
          <Campo label="IPRESS / Area usuaria"><input value={form.ipress} onChange={set("ipress")} className="input" /></Campo>
          <Campo label="Descripcion segun el TDR">
            <CampoTexto value={form.descripcionTdr} onChange={(v) => setForm({ ...form, descripcionTdr: v })} multiline rows={2} />
          </Campo>

          {avisos.length > 0 && (
            <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2.5 text-amber-900">
              <p className="font-medium mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Revisa estos datos</p>
              {avisos.map((a, i) => <p key={i}>• {a.texto}</p>)}
              <p className="mt-1 text-amber-700">Puedes guardar igual; el aviso queda hasta que se corrija.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setForm(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">Cancelar</button>
            <button onClick={onGuardar} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
