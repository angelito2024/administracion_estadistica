import { useState, useMemo, useRef } from "react";
import {
  Plus, Trash2, Pencil, Upload, Download, X, TrendingUp, TrendingDown,
  Table2, BarChart3, ClipboardPaste, AlertTriangle,
} from "lucide-react";
import { monthKey, monthLabel, uid } from "../lib/fechas";
import { interpretarTabla, combinarIndicadores, variacion, fmtNumero, detectarAnio } from "../lib/consolidado";
import { exportarConsolidadoCSV } from "../lib/respaldo";
import CampoTexto from "./CampoTexto";

function mesesDelAnio(anio) {
  return Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}`);
}

function mesAnterior(mk) {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Consolidado({ data, persist }) {
  const [vista, setVista] = useState("mes");
  const [mes, setMes] = useState(monthKey());
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [form, setForm] = useState(null);
  const [importar, setImportar] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const indicadores = data.indicadores || [];

  function guardarIndicador() {
    if (!form.nombre.trim()) return;
    const existe = indicadores.some((i) => i.id === form.id);
    const next = existe
      ? indicadores.map((i) => (i.id === form.id ? form : i))
      : [...indicadores, { ...form, id: uid(), valores: {} }];
    persist({ ...data, indicadores: next });
    setForm(null);
  }

  function eliminarIndicador(ind) {
    const n = Object.keys(ind.valores || {}).length;
    if (!window.confirm(`¿Eliminar "${ind.nombre}" y sus ${n} mes(es) de informacion registrada?`)) return;
    persist({ ...data, indicadores: indicadores.filter((i) => i.id !== ind.id) });
  }

  function fijarValor(indId, mk, texto) {
    const next = indicadores.map((i) => {
      if (i.id !== indId) return i;
      const valores = { ...(i.valores || {}) };
      const t = String(texto).trim();
      if (t === "") delete valores[mk];
      else {
        const n = parseFloat(t.replace(",", "."));
        if (isNaN(n)) return i;
        valores[mk] = n;
      }
      return { ...i, valores };
    });
    persist({ ...data, indicadores: next });
  }

  const anios = useMemo(() => {
    const set = new Set([new Date().getFullYear()]);
    indicadores.forEach((i) => Object.keys(i.valores || {}).forEach((mk) => set.add(Number(mk.slice(0, 4)))));
    return [...set].sort((a, b) => b - a);
  }, [indicadores]);

  const grupos = useMemo(
    () => [...new Set(indicadores.map((i) => i.categoria).filter(Boolean))].sort(),
    [indicadores]
  );
  const [grupoFiltro, setGrupoFiltro] = useState("");
  const visibles = useMemo(
    () => (grupoFiltro ? indicadores.filter((i) => (i.categoria || "") === grupoFiltro) : indicadores),
    [indicadores, grupoFiltro]
  );

  const mesesTabla = mesesDelAnio(anio);
  const anterior = mesAnterior(mes);
  const cargadosEsteMes = visibles.filter((i) => (i.valores || {})[mes] !== undefined).length;

  const selectorGrupo = grupos.length > 0 && (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Grupo:
      <select value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)} className="input w-auto">
        <option value="">Todos ({indicadores.length})</option>
        {grupos.map((g) => (
          <option key={g} value={g}>
            {g} ({indicadores.filter((i) => i.categoria === g).length})
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          <button
            onClick={() => setVista("mes")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              vista === "mes" ? "bg-pnp-verde text-white border-pnp-verde" : "border-slate-300 text-slate-600"
            }`}
          >
            <Table2 size={13} /> Carga del mes
          </button>
          <button
            onClick={() => setVista("anual")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              vista === "anual" ? "bg-pnp-verde text-white border-pnp-verde" : "border-slate-300 text-slate-600"
            }`}
          >
            <BarChart3 size={13} /> Vista anual
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setImportar({ texto: "", anio: new Date().getFullYear(), anioManual: false, grupo: "", grupoManual: false, previa: null, error: "" })}
            className="flex items-center gap-1 text-sm border border-slate-300 text-slate-700 rounded px-3 py-1.5"
          >
            <Upload size={15} /> Cargar desde Excel
          </button>
          <button
            onClick={() => exportarConsolidadoCSV(visibles, mesesTabla, anio)}
            className="flex items-center gap-1 text-sm border border-slate-300 text-slate-700 rounded px-3 py-1.5"
          >
            <Download size={15} /> Exportar
          </button>
          <button
            onClick={() => setForm({ id: null, nombre: "", unidad: "", categoria: "" })}
            className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5"
          >
            <Plus size={15} /> Nuevo indicador
          </button>
        </div>
      </div>

      {indicadores.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded">
          <p className="font-serif text-lg text-slate-800 mb-1">Repositorio mensual de cifras</p>
          <p className="text-sm text-slate-500 max-w-lg mx-auto mb-4">
            Aqui se acumula mes a mes la informacion de tus reportes. Puedes crear los indicadores a mano o
            pegar directamente la tabla desde Excel: la app reconoce las columnas de meses y las carga solas.
          </p>
          <button
            onClick={() => setImportar({ texto: "", anio: new Date().getFullYear(), anioManual: false, grupo: "", grupoManual: false, previa: null, error: "" })}
            className="text-sm bg-pnp-verde text-white rounded px-4 py-2"
          >
            Cargar desde Excel
          </button>
        </div>
      ) : vista === "mes" ? (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Mes:
                <input type="month" value={mes} onChange={(e) => setMes(e.target.value || monthKey())} className="input w-auto" />
              </label>
              {selectorGrupo}
            </div>
            <p className="text-xs text-slate-500">
              {cargadosEsteMes} de {visibles.length} indicador(es) con cifra en {monthLabel(mes)}
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-3 py-2 font-medium">Indicador</th>
                  <th className="px-3 py-2 font-medium w-28">{monthLabel(anterior)}</th>
                  <th className="px-3 py-2 font-medium w-32">{monthLabel(mes)}</th>
                  <th className="px-3 py-2 font-medium w-24">Variacion</th>
                  <th className="px-3 py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {visibles.map((ind) => {
                  const actual = (ind.valores || {})[mes];
                  const previo = (ind.valores || {})[anterior];
                  const v = variacion(actual, previo);
                  return (
                    <tr key={ind.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5">
                        <button onClick={() => setDetalle(ind)} className="text-slate-800 hover:text-pnp-verde text-left">
                          {ind.nombre}
                        </button>
                        {ind.unidad && <span className="text-xs text-slate-400 ml-1">({ind.unidad})</span>}
                        {ind.categoria && <p className="text-[11px] text-slate-400">{ind.categoria}</p>}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">{fmtNumero(previo)}</td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="any"
                          defaultValue={actual === undefined ? "" : actual}
                          onBlur={(e) => fijarValor(ind.id, mes, e.target.value)}
                          placeholder="—"
                          className="input py-1"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        {v === null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span
                            className={`flex items-center gap-0.5 text-xs ${
                              v > 0 ? "text-emerald-700" : v < 0 ? "text-rose-700" : "text-slate-500"
                            }`}
                          >
                            {v > 0 ? <TrendingUp size={12} /> : v < 0 ? <TrendingDown size={12} /> : null}
                            {v > 0 ? "+" : ""}
                            {v}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setForm({ ...ind })} className="text-slate-400 hover:text-slate-700">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => eliminarIndicador(ind)} className="text-slate-400 hover:text-rose-600">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Escribe la cifra y sal del recuadro para guardarla. Deja el recuadro vacio para borrar ese mes.
          </p>
        </div>
      ) : (
        <VistaAnual
          indicadores={visibles}
          meses={mesesTabla}
          anio={anio}
          anios={anios}
          setAnio={setAnio}
          onDetalle={setDetalle}
          selectorGrupo={selectorGrupo}
        />
      )}

      {form && (
        <Modal onClose={() => setForm(null)} title={form.id ? "Editar indicador" : "Nuevo indicador"}>
          <div className="space-y-3">
            <Campo label="Nombre del indicador">
              <CampoTexto
                value={form.nombre}
                onChange={(v) => setForm({ ...form, nombre: v })}
                placeholder="Ej: Atenciones medicas ambulatorias"
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Unidad (opcional)">
                <input
                  value={form.unidad}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                  className="input"
                  placeholder="Ej: atenciones, S/, %"
                />
              </Campo>
              <Campo label="Grupo (opcional)">
                <CampoTexto
                  value={form.categoria}
                  onChange={(v) => setForm({ ...form, categoria: v })}
                  placeholder="Ej: Consulta externa"
                />
              </Campo>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">
                Cancelar
              </button>
              <button onClick={guardarIndicador} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {importar && (
        <ModalImportar
          estado={importar}
          setEstado={setImportar}
          mes={mes}
          indicadores={indicadores}
          onAplicar={(nuevos) => {
            persist({ ...data, indicadores: nuevos });
            setImportar(null);
          }}
        />
      )}

      {detalle && <ModalDetalle ind={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}

/* ---------- vista anual ---------- */
function VistaAnual({ indicadores, meses, anio, anios, setAnio, onDetalle, selectorGrupo }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Año:
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="input w-auto">
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        {selectorGrupo}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500">
              <th className="px-3 py-2 font-medium text-left sticky left-0 bg-slate-50">Indicador</th>
              {meses.map((mk) => (
                <th key={mk} className="px-2 py-2 font-medium text-right whitespace-nowrap">
                  {monthLabel(mk).slice(0, 3)}
                </th>
              ))}
              <th className="px-3 py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {indicadores.map((ind) => {
              const vals = ind.valores || {};
              const total = meses.reduce((s, mk) => s + (vals[mk] || 0), 0);
              return (
                <tr key={ind.id} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 sticky left-0 bg-white">
                    <button onClick={() => onDetalle(ind)} className="text-slate-800 hover:text-pnp-verde text-left">
                      {ind.nombre}
                    </button>
                    {ind.categoria && <p className="text-[11px] text-slate-400">{ind.categoria}</p>}
                  </td>
                  {meses.map((mk) => (
                    <td key={mk} className={`px-2 py-1.5 text-right ${vals[mk] === undefined ? "text-slate-300" : "text-slate-700"}`}>
                      {fmtNumero(vals[mk])}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right font-medium text-slate-900">{fmtNumero(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">Haz clic en el nombre de un indicador para ver su evolucion.</p>
    </div>
  );
}

/* ---------- grafico de un indicador ---------- */
function ModalDetalle({ ind, onClose }) {
  const claves = Object.keys(ind.valores || {}).sort();
  const ultimos = claves.slice(-12);
  const max = Math.max(1, ...ultimos.map((mk) => ind.valores[mk]));

  return (
    <Modal onClose={onClose} title={ind.nombre}>
      {ultimos.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Todavia no hay cifras cargadas para este indicador.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-3">
            Evolucion de los ultimos {ultimos.length} mes(es) con informacion{ind.unidad ? ` · ${ind.unidad}` : ""}.
          </p>
          <div className="flex items-end gap-1.5 h-40 border-b border-slate-200 pb-1">
            {ultimos.map((mk) => (
              <div key={mk} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[10px] text-slate-500 mb-0.5">{fmtNumero(ind.valores[mk])}</span>
                <div
                  className="w-full bg-pnp-verde rounded-t"
                  style={{ height: `${Math.max((ind.valores[mk] / max) * 100, 2)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {ultimos.map((mk) => (
              <span key={mk} className="flex-1 text-center text-[10px] text-slate-400">
                {monthLabel(mk).slice(0, 3)}
              </span>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------- importacion desde Excel ---------- */
const DISPOSICION = {
  "meses-en-filas": "meses en filas (los meses bajan por la primera columna)",
  "meses-en-columnas": "meses en columnas (la cabecera trae los meses)",
  simple: "una cifra por indicador",
};

function ModalImportar({ estado, setEstado, mes, indicadores, onAplicar }) {
  const inputArchivo = useRef(null);

  function analizar(texto, cambios = {}) {
    const detectado = detectarAnio(texto);
    const anioManual = cambios.anio !== undefined || estado.anioManual;
    const anio =
      cambios.anio !== undefined ? cambios.anio : estado.anioManual ? estado.anio : detectado || estado.anio;

    const r = interpretarTabla(texto, { mesPorDefecto: mes, anio });
    if (!r.filas.length) {
      setEstado({
        ...estado, texto, anio, anioManual, previa: null,
        error: "No se reconocio ninguna fila con cifras. Revisa que hayas copiado tambien la fila de cabecera.",
      });
      return;
    }

    const grupoManual = cambios.grupo !== undefined || estado.grupoManual;
    const grupo =
      cambios.grupo !== undefined
        ? cambios.grupo
        : estado.grupoManual
        ? estado.grupo
        : r.grupoSugerido || estado.grupo || "";

    const combinado = combinarIndicadores(indicadores, r.filas, uid, grupo);
    setEstado({ ...estado, texto, anio, anioManual, grupo, grupoManual, error: "", previa: { ...r, ...combinado, grupo } });
  }

  function leerArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => analizar(String(fr.result));
    fr.onerror = () => setEstado({ ...estado, error: "No se pudo leer el archivo." });
    fr.readAsText(file);
  }

  const p = estado.previa;

  return (
    <Modal onClose={() => setEstado(null)} title="Cargar informacion desde Excel">
      <div className="space-y-3">
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2.5">
          <p className="font-medium text-slate-700 mb-1">
            En Excel selecciona la tabla con su cabecera, copia (Ctrl+C) y pega abajo (Ctrl+V). Tambien puedes
            subir la hoja guardada como CSV.
          </p>
          <p className="mt-1.5">Se reconocen las dos formas de armar el cuadro:</p>
          <p>
            <b>a)</b> Los meses bajan por la primera columna (ENERO, FEBRERO…) y los indicadores son las columnas
            — como el cuadro de produccion. Si la cabecera tiene dos niveles (por ejemplo CONSULTA EXTERNA sobre
            CONSULTA MEDICA), se unen en un solo nombre.
          </p>
          <p>
            <b>b)</b> Los indicadores bajan por la primera columna y los meses estan en la cabecera
            (<i>Sep 2026</i>, <i>2026-09</i> o <i>09/2026</i>).
          </p>
          <p className="mt-1.5">Las filas y columnas de TOTAL se ignoran, y los titulos del cuadro tambien.</p>
        </div>

        <textarea
          value={estado.texto}
          onChange={(e) => analizar(e.target.value)}
          rows={7}
          placeholder={"MES\tCONSULTA EXTERNA\t\tPROCEDIMIENTOS\n\tMEDICA\tNO MEDICA\t\nENERO\t42,276\t16,230\t224,185"}
          className="input font-mono text-xs"
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-slate-500 mb-1">
              Año de los meses{" "}
              <span className="text-slate-400">
                {estado.anioManual ? "· fijado por ti" : p?.anioDetectado ? "· tomado del titulo" : ""}
              </span>
            </span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={estado.anio}
              onChange={(e) => analizar(estado.texto, { anio: Number(e.target.value) })}
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-500 mb-1">
              Grupo del cuadro{" "}
              <span className="text-slate-400">
                {estado.grupoManual ? "· fijado por ti" : p?.grupoSugerido ? "· tomado del titulo" : ""}
              </span>
            </span>
            <input
              value={estado.grupo}
              onChange={(e) => analizar(estado.texto, { grupo: e.target.value })}
              placeholder="Ej: IPRESS Nivel II"
              className="input"
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-500 -mt-1">
          El grupo mantiene separados los indicadores que se llaman igual en distintos cuadros: sin el, la
          CONSULTA MEDICA de Nivel II pisaria la de Nivel I. El año se usa cuando los meses vienen sin año
          (ENERO, FEBRERO…).
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => inputArchivo.current?.click()}
            className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-700 rounded px-3 py-1.5"
          >
            <Upload size={15} /> Elegir archivo CSV
          </button>
          <input ref={inputArchivo} type="file" accept=".csv,.txt" onChange={leerArchivo} className="hidden" />
          {estado.texto && (
            <button
              onClick={() => setEstado({ texto: "", previa: null, error: "" })}
              className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-600 rounded px-3 py-1.5"
            >
              <X size={15} /> Limpiar
            </button>
          )}
        </div>

        {estado.error && (
          <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded px-3 py-2 flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {estado.error}
          </p>
        )}

        {p && (
          <div className="border border-emerald-200 bg-emerald-50 rounded p-3 text-sm">
            <p className="font-medium text-emerald-900 flex items-center gap-1.5 mb-1">
              <ClipboardPaste size={14} /> Se reconocieron {p.filas.length} indicador(es) y {p.celdas} cifra(s)
            </p>
            <ul className="text-xs text-emerald-800 space-y-0.5">
              <li>Cuadro leido con {DISPOSICION[p.modo] || p.modo}</li>
              <li>Grupo: {p.grupo ? <b>{p.grupo}</b> : <i>sin grupo</i>}</li>
              <li>Meses: {p.meses.map(monthLabel).join(", ")}</li>
              <li>{p.actualizados} indicador(es) existentes se actualizan</li>
              <li>{p.agregados} indicador(es) nuevos se crean</li>
              {p.ignoradas > 0 && <li className="text-amber-800">{p.ignoradas} fila(s) sin cifra se ignoran</li>}
            </ul>
            <div className="mt-2 pt-2 border-t border-emerald-200">
              <p className="text-[11px] text-emerald-700 mb-1">Revisa que los nombres hayan quedado bien:</p>
              <ul className="text-xs text-emerald-900 space-y-0.5">
                {p.filas.slice(0, 8).map((f) => (
                  <li key={f.nombre}>
                    · {f.nombre} <span className="text-emerald-600">({Object.keys(f.valores).length} mes/es)</span>
                  </li>
                ))}
                {p.filas.length > 8 && <li className="text-emerald-600">y {p.filas.length - 8} mas…</li>}
              </ul>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1.5">
              Los meses que ya tenias y no vienen en esta carga se conservan.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setEstado(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">
            Cancelar
          </button>
          <button
            onClick={() => p && onAplicar(p.indicadores)}
            disabled={!p}
            className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white disabled:opacity-40"
          >
            Cargar al repositorio
          </button>
        </div>
      </div>
    </Modal>
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
        className="bg-white rounded-lg p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
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
