import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Check, Clock, AlertTriangle, Phone, Mail, X, Pencil, Cake, Archive, Settings2, MapPin, Target, Activity } from "lucide-react";
import Portada from "./components/Portada";
import Desempeno from "./components/Desempeno";
import RespaldoTab from "./components/Respaldo";
import Documentos, { documentosVencidos, documentosPorResponder } from "./components/Documentos";
import Locadores, { locadoresPendientes, contratosPorVencer } from "./components/Locadores";
import Consolidado from "./components/Consolidado";
import { BarraAvance, ResumenSeguimiento, ModalAvance } from "./components/Seguimiento";
import CampoTexto, { CorreccionProvider } from "./components/CampoTexto";
import { todayStr, monthKey, diffDays, daysDiff, uid, fmtDate, monthLabel, last6Months } from "./lib/fechas";
import { guardarCopiaDiaria } from "./lib/respaldo";

const STORAGE_KEY = "gestion-oficina-data";

// Almacenamiento en el navegador de esta PC.
const storage = {
  async get(key) {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return { key, value: raw };
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
    return { key, value };
  },
};

const DEFAULT_CATEGORIES = [
  "SEIS", "Correo PNP", "SGD", "Reportes fijos", "Llamadas telefonicas", "Reuniones", "Archivo y documentacion", "Otro",
];

const emptyData = {
  staff: [], tasks: [], reports: [], adhoc: [], archive: [], documentos: [], locadores: [], indicadores: [],
  categories: DEFAULT_CATEGORIES, settings: { correccion: true },
};

const PRIORITIES = [
  { id: "alta", label: "Alta", ring: "border-rose-300", text: "text-rose-800", bg: "bg-rose-50" },
  { id: "media", label: "Media", ring: "border-amber-300", text: "text-amber-800", bg: "bg-amber-50" },
  { id: "baja", label: "Baja", ring: "border-slate-300", text: "text-slate-700", bg: "bg-slate-50" },
];
const STATUSES = [
  { id: "pendiente", label: "Pendiente" },
  { id: "en_curso", label: "En curso" },
  { id: "completado", label: "Completado" },
];

export default function GestionOficina() {
  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("panel");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setData({
            ...emptyData,
            ...parsed,
            categories: parsed.categories && parsed.categories.length ? parsed.categories : DEFAULT_CATEGORIES,
          });
        }
      } catch (e) {
        // no data yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function persist(next) {
    setData(next);
    guardarCopiaDiaria(next);
    try {
      const ok = await storage.set(STORAGE_KEY, JSON.stringify(next), false);
      if (!ok) setError("No se pudo guardar. Intenta de nuevo.");
      else setError("");
    } catch (e) {
      setError("No se pudo guardar. Intenta de nuevo.");
    }
  }

  const staffById = useMemo(() => {
    const m = {};
    data.staff.forEach((s) => (m[s.id] = s));
    return m;
  }, [data.staff]);

  const correccionActiva = (data.settings || {}).correccion !== false;
  const ultimoRespaldo = (data.settings || {}).ultimoRespaldo || null;
  const hayDatos = data.staff.length + data.tasks.length + data.reports.length > 0;
  const alertaRespaldo = ultimoRespaldo === null ? hayDatos : diffDays(ultimoRespaldo, todayStr()) >= 7;

  const docsVencidos = documentosVencidos(data);
  const docsPorResponder = documentosPorResponder(data);
  const locPendientes = locadoresPendientes(data);

  const overdueTasks = data.tasks.filter((t) => t.status !== "completado" && daysDiff(t.dueDate) < 0);
  const dueSoonTasks = data.tasks.filter((t) => t.status !== "completado" && daysDiff(t.dueDate) >= 0 && daysDiff(t.dueDate) <= 3);
  const pendingTasks = data.tasks.filter((t) => t.status !== "completado");

  if (!loaded) {
    return <div style={{ padding: "2rem", color: "#64748b", fontSize: 14 }}>Cargando…</div>;
  }

  return (
    <CorreccionProvider activo={correccionActiva} extra={(data.settings || {}).diccionario || {}}>
    <div className="w-full max-w-6xl mx-auto bg-white text-slate-800 min-h-screen shadow-sm" style={{ fontFamily: "system-ui, sans-serif" }}>
      <Portada
        tab={tab}
        setTab={setTab}
        overdueCount={overdueTasks.length}
        docsVencidos={docsVencidos.length}
        alertaRespaldo={alertaRespaldo}
      />
      {error && (
        <div className="mx-4 mt-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</div>
      )}
      <div className="p-4 sm:p-6">
        {tab === "panel" && (
          <Panel
            data={data}
            staffById={staffById}
            docsPorResponder={docsPorResponder}
            docsVencidos={docsVencidos}
            locPendientes={locPendientes}
            contratosVencen={contratosPorVencer(data)}
            overdueTasks={overdueTasks}
            dueSoonTasks={dueSoonTasks}
            pendingTasks={pendingTasks}
            goTo={setTab}
          />
        )}
        {tab === "tareas" && <Tareas data={data} persist={persist} staffById={staffById} />}
        {tab === "reportes" && <Reportes data={data} persist={persist} />}
        {tab === "archivo" && <Archivo data={data} persist={persist} />}
        {tab === "personal" && <Personal data={data} persist={persist} />}
        {tab === "desempeno" && <Desempeno data={data} goTo={setTab} />}
        {tab === "documentos" && <Documentos data={data} persist={persist} staffById={staffById} />}
        {tab === "locadores" && <Locadores data={data} persist={persist} />}
        {tab === "consolidado" && <Consolidado data={data} persist={persist} />}
        {tab === "respaldo" && <RespaldoTab data={data} persist={persist} staffById={staffById} />}
      </div>
    </div>
    </CorreccionProvider>
  );
}

/* ---------- PANEL ---------- */
function Panel({ data, staffById, overdueTasks, dueSoonTasks, pendingTasks, goTo, docsPorResponder = [], docsVencidos = [], locPendientes = [], contratosVencen = [] }) {
  const reportsThisMonth = data.reports.filter((r) => {
    const mk = monthKey();
    return (r.months || {})[mk] !== "completado";
  });
  const completedWithDuration = data.tasks.filter((t) => t.status === "completado" && t.completedAt && t.createdAt);
  const avgDays = completedWithDuration.length
    ? Math.round(
        (completedWithDuration.reduce((sum, t) => sum + Math.max(diffDays(t.createdAt, t.completedAt), 0), 0) /
          completedWithDuration.length) * 10
      ) / 10
    : null;

  const months = last6Months();
  const completionByMonth = months.map((mk) => {
    const total = data.reports.length;
    if (total === 0) return { mk, pct: 0 };
    const done = data.reports.filter((r) => (r.months || {})[mk] === "completado").length;
    return { mk, pct: Math.round((done / total) * 100) };
  });

  if (data.staff.length === 0 && data.tasks.length === 0 && data.reports.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-serif text-lg text-slate-800 mb-1">Empieza registrando tu equipo</p>
        <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
          Agrega a tu personal en la pestana Personal, luego crea tareas y reportes para hacerles seguimiento aqui.
        </p>
        <button onClick={() => goTo("personal")} className="text-sm bg-pnp-verde text-white rounded px-4 py-2">
          Ir a Personal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Metric label="Tareas pendientes" value={pendingTasks.length} tone="slate" />
        <Metric label="Tareas atrasadas" value={overdueTasks.length} tone="rose" />
        <Metric label="Por vencer (3 dias)" value={dueSoonTasks.length} tone="amber" />
        <Metric label="Reportes por enviar" value={reportsThisMonth.length} tone="slate" />
        <Metric label="Dias promedio por tarea" value={avgDays === null ? "—" : avgDays} tone="slate" />
      </div>

      {(docsVencidos.length > 0 || locPendientes.length > 0 || contratosVencen.length > 0) && (
        <div className="grid sm:grid-cols-3 gap-3">
          {docsVencidos.length > 0 && (
            <Aviso
              tono="rose"
              titulo={`${docsVencidos.length} documento(s) sin responder fuera de plazo`}
              detalle={`${docsPorResponder.length} en total esperan respuesta`}
              onClick={() => goTo("documentos")}
            />
          )}
          {locPendientes.length > 0 && (
            <Aviso
              tono="amber"
              titulo={`${locPendientes.length} locador(es) con tramite incompleto`}
              detalle="Informe, conformidad, recibo o pago del mes"
              onClick={() => goTo("locadores")}
            />
          )}
          {contratosVencen.length > 0 && (
            <Aviso
              tono="amber"
              titulo={`${contratosVencen.length} contrato(s) por vencer`}
              detalle="En los proximos 30 dias"
              onClick={() => goTo("locadores")}
            />
          )}
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Atrasadas</h3>
          <div className="space-y-1.5">
            {overdueTasks.slice(0, 6).map((t) => (
              <TaskRow key={t.id} t={t} staff={staffById[t.assignedTo]} />
            ))}
          </div>
        </div>
      )}

      {dueSoonTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Vencen pronto</h3>
          <div className="space-y-1.5">
            {dueSoonTasks.slice(0, 6).map((t) => (
              <TaskRow key={t.id} t={t} staff={staffById[t.assignedTo]} />
            ))}
          </div>
        </div>
      )}

      {data.reports.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Cumplimiento de reportes fijos, ultimos 6 meses</h3>
          <div className="flex items-end gap-3 h-32 border-b border-slate-200 pb-1">
            {completionByMonth.map((m) => (
              <div key={m.mk} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs text-slate-500 mb-1">{m.pct}%</span>
                <div
                  className="w-full bg-slate-700 rounded-t"
                  style={{ height: `${Math.max(m.pct, 3)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-1">
            {completionByMonth.map((m) => (
              <span key={m.mk} className="flex-1 text-center text-xs text-slate-400">
                {monthLabel(m.mk)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Aviso({ tono, titulo, detalle, onClick }) {
  const tonos = {
    rose: "border-rose-300 bg-rose-50 text-rose-900",
    amber: "border-amber-300 bg-amber-50 text-amber-900",
  };
  return (
    <button onClick={onClick} className={`text-left border rounded p-3 ${tonos[tono]}`}>
      <p className="text-sm font-medium flex items-center gap-1.5">
        <AlertTriangle size={14} /> {titulo}
      </p>
      <p className="text-xs opacity-80 mt-0.5">{detalle}</p>
    </button>
  );
}

function Metric({ label, value, tone }) {
  const tones = {
    slate: "bg-slate-50 text-slate-900",
    rose: "bg-rose-50 text-rose-800",
    amber: "bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded p-3 ${tones[tone]}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-serif">{value}</p>
    </div>
  );
}

function TaskRow({ t, staff }) {
  const d = daysDiff(t.dueDate);
  const overdue = d < 0;
  return (
    <div className="flex items-center justify-between text-sm border border-slate-200 rounded px-3 py-2">
      <div className="min-w-0">
        <p className="text-slate-800 truncate">{t.title}</p>
        <p className="text-xs text-slate-500">
          {staff ? staff.name : "Sin asignar"} · {t.category}
        </p>
      </div>
      <span className={`text-xs whitespace-nowrap ml-2 ${overdue ? "text-rose-700" : "text-amber-700"}`}>
        {fmtDate(t.dueDate)} {t.dueTime ? `· ${t.dueTime}` : ""}
      </span>
    </div>
  );
}

/* ---------- TAREAS ---------- */
function Tareas({ data, persist, staffById }) {
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("todas");
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [avanceForm, setAvanceForm] = useState(null);

  function openNew() {
    setForm({
      id: null, title: "", category: data.categories[0] || "", assignedTo: data.staff[0]?.id || "",
      dueDate: todayStr(), dueTime: "", priority: "media", status: "pendiente", notes: "",
    });
  }
  function openEdit(t) { setForm({ ...t }); }

  function save() {
    if (!form.title.trim()) return;
    const exists = data.tasks.some((t) => t.id === form.id);
    const next = exists
      ? data.tasks.map((t) => (t.id === form.id ? form : t))
      : [...data.tasks, { ...form, id: uid(), createdAt: todayStr() }];
    persist({ ...data, tasks: next });
    setForm(null);
  }
  function remove(t) {
    if (!window.confirm(`¿Eliminar la tarea "${t.title}"? Esta accion no se puede deshacer.`)) return;
    persist({ ...data, tasks: data.tasks.filter((x) => x.id !== t.id) });
  }
  function setStatus(id, status) {
    persist({
      ...data,
      tasks: data.tasks.map((t) => {
        if (t.id !== id) return t;
        if (status === "completado") return { ...t, status, avance: 100, completedAt: t.completedAt || todayStr() };
        return { ...t, status, completedAt: null };
      }),
    });
  }


  // Registra el avance del dia: porcentaje, observacion y, si hace falta, nueva fecha.
  function guardarAvance(t, datos) {
    const entrada = {
      id: uid(),
      fecha: todayStr(),
      texto: datos.texto,
      avance: datos.avance,
    };
    const next = {
      ...t,
      avance: datos.avance,
      seguimiento: [...(t.seguimiento || []), entrada],
    };
    if (datos.nuevaFecha) {
      next.fechaOriginal = t.fechaOriginal || t.dueDate;
      next.reprogramaciones = [
        ...(t.reprogramaciones || []),
        { de: t.dueDate, a: datos.nuevaFecha, fecha: todayStr(), motivo: datos.texto },
      ];
      next.dueDate = datos.nuevaFecha;
    }
    if (datos.avance >= 100) {
      next.status = "completado";
      next.completedAt = t.completedAt || todayStr();
    } else if (datos.avance > 0 && next.status === "pendiente") {
      next.status = "en_curso";
    }
    persist({ ...data, tasks: data.tasks.map((x) => (x.id === t.id ? next : x)) });
    setAvanceForm(null);
  }

  const filtered = data.tasks
    .filter((t) => filter === "todas" || t.status === filter)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex gap-1">
          {["todas", ...STATUSES.map((s) => s.id)].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                filter === f ? "bg-pnp-verde text-white border-slate-800" : "border-slate-300 text-slate-600"
              }`}
            >
              {f === "todas" ? "Todas" : STATUSES.find((s) => s.id === f).label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCatModalOpen(true)}
            className="flex items-center gap-1 text-sm border border-slate-300 text-slate-600 rounded px-3 py-1.5"
          >
            <Settings2 size={15} /> Categorias
          </button>
          <button
            onClick={openNew}
            disabled={data.staff.length === 0}
            className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5 disabled:opacity-40"
          >
            <Plus size={15} /> Nueva tarea
          </button>
        </div>
      </div>

      {data.staff.length === 0 && (
        <p className="text-sm text-slate-500 mb-4">Registra personal primero para poder asignar tareas.</p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">Sin tareas en esta vista.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const s = staffById[t.assignedTo];
            const d = daysDiff(t.dueDate);
            const overdue = t.status !== "completado" && d < 0;
            const prio = PRIORITIES.find((p) => p.id === t.priority) || PRIORITIES[1];
            return (
              <div key={t.id} className={`border rounded p-3 ${overdue ? "border-rose-300 bg-rose-50/40" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-slate-900 font-medium">{t.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${prio.ring} ${prio.text} ${prio.bg}`}>{prio.label}</span>
                      <span className="text-xs text-slate-400">{t.category}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{s ? s.name : "Sin asignar"}</span>
                      {s?.phone && <span className="flex items-center gap-1"><Phone size={11} />{s.phone}</span>}
                      {s?.email && <span className="flex items-center gap-1"><Mail size={11} />{s.email}</span>}
                      <span className={`flex items-center gap-1 ${overdue ? "text-rose-700" : ""}`}>
                        <Clock size={11} /> {fmtDate(t.dueDate)} {t.dueTime}
                        {overdue && ` · atrasada ${Math.abs(d)}d`}
                      </span>
                      {t.status === "completado" && t.completedAt && (
                        <span className="text-emerald-700">
                          Atendida en {Math.max(diffDays(t.createdAt, t.completedAt), 0)} dia(s)
                        </span>
                      )}
                    </div>
                    {t.notes && <p className="text-xs text-slate-500 mt-1">{t.notes}</p>}
                    {t.status !== "completado" && (
                      <div className="mt-1.5 max-w-xs">
                        <BarraAvance valor={t.avance || 0} />
                      </div>
                    )}
                    <ResumenSeguimiento tarea={t} />
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <select
                      value={t.status}
                      onChange={(e) => setStatus(t.id, e.target.value)}
                      className="text-xs border border-slate-300 rounded px-1.5 py-1 bg-white"
                    >
                      {STATUSES.map((s2) => <option key={s2.id} value={s2.id}>{s2.label}</option>)}
                    </select>
                    {t.status !== "completado" && (
                      <button
                        onClick={() => setAvanceForm(t)}
                        className="flex items-center gap-1 text-xs border border-slate-300 text-slate-600 rounded px-2 py-1 hover:border-pnp-verde hover:text-pnp-verde whitespace-nowrap"
                      >
                        <Activity size={12} /> Avance
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                      <button onClick={() => remove(t)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <Modal onClose={() => setForm(null)} title={form.id ? "Editar tarea" : "Nueva tarea"}>
          <div className="space-y-3">
            <Field label="Titulo">
              <CampoTexto value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Ej: Enviar informe de brechas" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                  {form.category && !data.categories.includes(form.category) && (
                    <option value={form.category}>{form.category} (categoria retirada)</option>
                  )}
                  {data.categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Asignado a">
                <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="input">
                  <option value="">— Sin asignar —</option>
                  {data.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Fecha limite">
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input" />
              </Field>
              <Field label="Hora">
                <input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} className="input" />
              </Field>
              <Field label="Prioridad">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
                  {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notas">
              <CampoTexto value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline rows={2} />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">Cancelar</button>
              <button onClick={save} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {avanceForm && (
        <ModalAvance
          tarea={avanceForm}
          onGuardar={(datos) => guardarAvance(avanceForm, datos)}
          onClose={() => setAvanceForm(null)}
        />
      )}

      {catModalOpen && (
        <CategoryManagerModal
          data={data}
          persist={persist}
          onClose={() => setCatModalOpen(false)}
        />
      )}
    </div>
  );
}

function CategoryManagerModal({ data, persist, onClose }) {
  const [filas, setFilas] = useState(() => data.categories.map((c) => ({ orig: c, valor: c })));
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState("");

  // Cuantos registros usan una categoria (tareas + archivo).
  function usos(nombre) {
    if (!nombre) return 0;
    return (
      data.tasks.filter((t) => t.category === nombre).length +
      data.archive.filter((a) => a.category === nombre).length
    );
  }

  function editar(i, valor) {
    setFilas(filas.map((f, idx) => (idx === i ? { ...f, valor } : f)));
    setError("");
  }

  function quitar(i) {
    const fila = filas[i];
    const n = usos(fila.orig);
    if (n > 0) {
      const ok = window.confirm(
        `${n} registro(s) usan "${fila.orig}".\n\n` +
          "Si la quitas de la lista, esos registros conservan el nombre pero la categoria ya no aparecera " +
          "al crear nuevos. Si lo que quieres es cambiarle el nombre, editala en vez de eliminarla.\n\n¿Quitarla igual?"
      );
      if (!ok) return;
    }
    setFilas(filas.filter((_, idx) => idx !== i));
  }

  function agregar() {
    const v = nueva.trim();
    if (!v) return;
    if (filas.some((f) => f.valor.trim().toLowerCase() === v.toLowerCase())) {
      setError("Esa categoria ya esta en la lista.");
      return;
    }
    setFilas([...filas, { orig: null, valor: v }]);
    setNueva("");
    setError("");
  }

  function guardar() {
    const limpias = filas.map((f) => ({ ...f, valor: f.valor.trim() })).filter((f) => f.valor);
    const nombres = limpias.map((f) => f.valor.toLowerCase());
    if (new Set(nombres).size !== nombres.length) {
      setError("Hay categorias repetidas. Revisa la lista.");
      return;
    }

    // Renombrados: la clave es el nombre viejo, el valor el nuevo.
    const renombres = {};
    limpias.forEach((f) => {
      if (f.orig && f.orig !== f.valor) renombres[f.orig] = f.valor;
    });

    const afectados = Object.keys(renombres).reduce((s, k) => s + usos(k), 0);
    if (afectados > 0) {
      const detalle = Object.entries(renombres).map(([a, b]) => `  ${a} → ${b}`).join("\n");
      const ok = window.confirm(
        `Se actualizaran ${afectados} registro(s) con los nombres nuevos:\n\n${detalle}\n\n¿Continuar?`
      );
      if (!ok) return;
    }

    const lista = limpias.map((f) => f.valor);
    persist({
      ...data,
      categories: lista.length ? lista : DEFAULT_CATEGORIES,
      tasks: data.tasks.map((t) => (renombres[t.category] ? { ...t, category: renombres[t.category] } : t)),
      archive: data.archive.map((a) => (renombres[a.category] ? { ...a, category: renombres[a.category] } : a)),
    });
    onClose();
  }

  return (
    <Modal onClose={onClose} title="Gestionar categorias">
      <p className="text-xs text-slate-500 mb-3">
        Si cambias el nombre de una categoria, se actualiza tambien en las tareas y documentos que ya la usan.
      </p>
      <div className="space-y-2">
        {filas.map((f, i) => {
          const n = usos(f.orig);
          const cambiada = f.orig && f.orig !== f.valor.trim();
          return (
            <div key={f.orig || `nueva-${i}`}>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <CampoTexto value={f.valor} onChange={(v) => editar(i, v)} mayusculas={false} />
                </div>
                <span className="text-[11px] text-slate-400 w-14 text-right shrink-0">
                  {n > 0 ? `${n} uso${n > 1 ? "s" : ""}` : f.orig ? "sin uso" : "nueva"}
                </span>
                <button onClick={() => quitar(i)} className="text-slate-400 hover:text-rose-600 shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
              {cambiada && (
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {f.orig} → {f.valor.trim()}
                  {n > 0 ? ` · se actualizaran ${n} registro(s)` : ""}
                </p>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-2 pt-1">
          <input
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Nueva categoria"
            className="input"
            onKeyDown={(e) => e.key === "Enter" && agregar()}
          />
          <button onClick={agregar} className="text-slate-400 hover:text-slate-700 shrink-0">
            <Plus size={18} />
          </button>
        </div>

        {error && <p className="text-xs text-rose-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-slate-300">
            Cancelar
          </button>
          <button onClick={guardar} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- REPORTES ---------- */
function Reportes({ data, persist }) {
  const [form, setForm] = useState(null);
  const [adhocForm, setAdhocForm] = useState(null);
  const mk = monthKey();

  function saveReport() {
    if (!form.name.trim()) return;
    const exists = data.reports.some((r) => r.id === form.id);
    const next = exists
      ? data.reports.map((r) => (r.id === form.id ? form : r))
      : [...data.reports, { ...form, id: uid(), months: {} }];
    persist({ ...data, reports: next });
    setForm(null);
  }
  function removeReport(r) {
    if (!window.confirm(`¿Eliminar el reporte fijo "${r.name}" y todo su historial de meses?`)) return;
    persist({ ...data, reports: data.reports.filter((x) => x.id !== r.id) });
  }
  function toggleMonth(r) {
    const months = { ...(r.months || {}) };
    months[mk] = months[mk] === "completado" ? "pendiente" : "completado";
    persist({ ...data, reports: data.reports.map((x) => (x.id === r.id ? { ...x, months } : x)) });
  }

  function saveAdhoc() {
    if (!adhocForm.title.trim()) return;
    const exists = data.adhoc.some((a) => a.id === adhocForm.id);
    const next = exists
      ? data.adhoc.map((a) => (a.id === adhocForm.id ? adhocForm : a))
      : [...data.adhoc, { ...adhocForm, id: uid() }];
    persist({ ...data, adhoc: next });
    setAdhocForm(null);
  }
  function removeAdhoc(a) {
    if (!window.confirm(`¿Eliminar la solicitud "${a.title}"?`)) return;
    persist({ ...data, adhoc: data.adhoc.filter((x) => x.id !== a.id) });
  }
  function toggleAdhocStatus(a) {
    const status = a.status === "completado" ? "pendiente" : "completado";
    persist({ ...data, adhoc: data.adhoc.map((x) => (x.id === a.id ? { ...x, status } : x)) });
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700">Reportes fijos mensuales — {monthLabel(mk)}</h3>
          <button
            onClick={() => setForm({ id: null, name: "", category: "Estadistica", dueDay: 5, notes: "" })}
            className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5"
          >
            <Plus size={15} /> Nuevo reporte fijo
          </button>
        </div>
        {data.reports.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Registra tus reportes fijos (ej: los diez que envias cada mes) para marcar cual esta enviado y cual pendiente.
          </p>
        ) : (
          <div className="space-y-1.5">
            {data.reports.map((r) => {
              const done = (r.months || {})[mk] === "completado";
              const overdue = !done && new Date().getDate() > r.dueDay;
              return (
                <div key={r.id} className={`flex items-center justify-between border rounded px-3 py-2 ${overdue ? "border-rose-300 bg-rose-50/40" : "border-slate-200"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleMonth(r)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        done ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"
                      }`}
                    >
                      {done && <Check size={13} />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.category} · vence el dia {r.dueDay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {overdue && <AlertTriangle size={14} className="text-rose-600" />}
                    <button onClick={() => setForm(r)} className="text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                    <button onClick={() => removeReport(r)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700">Solicitudes puntuales (informacion, oficios, etc.)</h3>
          <button
            onClick={() => setAdhocForm({ id: null, title: "", requestedBy: "", dueDate: todayStr(), status: "pendiente" })}
            className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5"
          >
            <Plus size={15} /> Nueva solicitud
          </button>
        </div>
        {data.adhoc.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Aqui van los pedidos que llegan en cualquier momento, fuera de los reportes fijos.</p>
        ) : (
          <div className="space-y-1.5">
            {[...data.adhoc].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")).map((a) => {
              const done = a.status === "completado";
              const d = daysDiff(a.dueDate);
              const overdue = !done && d < 0;
              return (
                <div key={a.id} className={`flex items-center justify-between border rounded px-3 py-2 ${overdue ? "border-rose-300 bg-rose-50/40" : "border-slate-200"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleAdhocStatus(a)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        done ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"
                      }`}
                    >
                      {done && <Check size={13} />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.requestedBy || "Sin solicitante"} · {fmtDate(a.dueDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setAdhocForm(a)} className="text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                    <button onClick={() => removeAdhoc(a)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {form && (
        <Modal onClose={() => setForm(null)} title={form.id ? "Editar reporte fijo" : "Nuevo reporte fijo"}>
          <div className="space-y-3">
            <Field label="Nombre del reporte">
              <CampoTexto value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ej: Reporte de coberturas de salud" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria / area">
                <CampoTexto value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
              </Field>
              <Field label="Dia de vencimiento (del mes)">
                <input type="number" min={1} max={31} value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: parseInt(e.target.value || "1", 10) })} className="input" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">Cancelar</button>
              <button onClick={saveReport} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {adhocForm && (
        <Modal onClose={() => setAdhocForm(null)} title={adhocForm.id ? "Editar solicitud" : "Nueva solicitud"}>
          <div className="space-y-3">
            <Field label="Que se pide">
              <CampoTexto value={adhocForm.title} onChange={(v) => setAdhocForm({ ...adhocForm, title: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quien lo pide">
                <CampoTexto value={adhocForm.requestedBy} onChange={(v) => setAdhocForm({ ...adhocForm, requestedBy: v })} />
              </Field>
              <Field label="Fecha limite">
                <input type="date" value={adhocForm.dueDate} onChange={(e) => setAdhocForm({ ...adhocForm, dueDate: e.target.value })} className="input" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setAdhocForm(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">Cancelar</button>
              <button onClick={saveAdhoc} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">Guardar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- ARCHIVO ---------- */
function Archivo({ data, persist }) {
  const [form, setForm] = useState(null);
  const [q, setQ] = useState("");

  function openNew() {
    setForm({
      id: null, title: "", category: data.categories[0] || "", type: "fisica",
      location: "", date: todayStr(), notes: "",
    });
  }
  function save() {
    if (!form.title.trim()) return;
    const exists = data.archive.some((a) => a.id === form.id);
    const next = exists
      ? data.archive.map((a) => (a.id === form.id ? form : a))
      : [...data.archive, { ...form, id: uid() }];
    persist({ ...data, archive: next });
    setForm(null);
  }
  function remove(a) {
    if (!window.confirm(`¿Eliminar el registro "${a.title}" del archivo?`)) return;
    persist({ ...data, archive: data.archive.filter((x) => x.id !== a.id) });
  }

  const filtered = data.archive
    .filter((a) => !q.trim() || [a.title, a.category, a.location, a.notes].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar documento, categoria o ubicacion"
          className="input max-w-xs"
        />
        <button onClick={openNew} className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5">
          <Plus size={15} /> Registrar documento
        </button>
      </div>

      {data.archive.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">
          Aqui puedes llevar el repositorio de tu documentacion, sea fisica (que carpeta o estante) o virtual (que carpeta o enlace).
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No hay coincidencias para esa busqueda.</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-center justify-between border border-slate-200 rounded px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <Archive size={15} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">{a.title}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>{a.category}</span>
                    <span>· {a.type === "fisica" ? "Fisica" : "Virtual"}</span>
                    {a.location && <span className="flex items-center gap-1"><MapPin size={11} />{a.location}</span>}
                    <span>· {fmtDate(a.date)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setForm(a)} className="text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                <button onClick={() => remove(a)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal onClose={() => setForm(null)} title={form.id ? "Editar documento" : "Registrar documento"}>
          <div className="space-y-3">
            <Field label="Documento / expediente">
              <CampoTexto value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Ej: Legajo personal 2026" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                  {form.category && !data.categories.includes(form.category) && (
                    <option value={form.category}>{form.category} (categoria retirada)</option>
                  )}
                  {data.categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Tipo">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                  <option value="fisica">Fisica</option>
                  <option value="virtual">Virtual</option>
                </select>
              </Field>
            </div>
            <Field label={form.type === "fisica" ? "Ubicacion (estante, carpeta, archivador)" : "Ubicacion (carpeta, enlace, servidor)"}>
              <CampoTexto value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            </Field>
            <Field label="Fecha de registro">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
            </Field>
            <Field label="Notas">
              <CampoTexto value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline rows={2} />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">Cancelar</button>
              <button onClick={save} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">Guardar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- PERSONAL ---------- */
function Personal({ data, persist }) {
  const [form, setForm] = useState(null);

  function save() {
    if (!form.name.trim()) return;
    const exists = data.staff.some((s) => s.id === form.id);
    const next = exists
      ? data.staff.map((s) => (s.id === form.id ? form : s))
      : [...data.staff, { ...form, id: uid() }];
    persist({ ...data, staff: next });
    setForm(null);
  }
  function remove(s) {
    const suyas = data.tasks.filter((t) => t.assignedTo === s.id && t.status !== "completado").length;
    const aviso = suyas ? ` Tiene ${suyas} tarea(s) sin completar que quedaran sin asignar.` : "";
    if (!window.confirm(`¿Eliminar a ${s.name}?${aviso}`)) return;
    persist({
      ...data,
      staff: data.staff.filter((x) => x.id !== s.id),
      tasks: data.tasks.map((t) => (t.assignedTo === s.id ? { ...t, assignedTo: "" } : t)),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700">Personal a cargo</h3>
        <button
          onClick={() => setForm({ id: null, name: "", role: "", phone: "", email: "", birthday: "", metaMensual: "" })}
          className="flex items-center gap-1 text-sm bg-pnp-verde text-white rounded px-3 py-1.5"
        >
          <Plus size={15} /> Agregar persona
        </button>
      </div>

      {data.staff.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">Aun no registras personal. Agrega a tu equipo para poder asignarles tareas.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {data.staff.map((s) => {
            const pending = data.tasks.filter((t) => t.assignedTo === s.id && t.status !== "completado").length;
            return (
              <div key={s.id} className="border border-slate-200 rounded p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setForm(s)} className="text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                    <button onClick={() => remove(s)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  {s.phone && <p className="flex items-center gap-1"><Phone size={11} />{s.phone}</p>}
                  {s.email && <p className="flex items-center gap-1"><Mail size={11} />{s.email}</p>}
                  {s.birthday && <p className="flex items-center gap-1"><Cake size={11} />{s.birthday}</p>}
                </div>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-2 flex-wrap">
                  <span>{pending} tarea(s) pendiente(s)</span>
                  {s.metaMensual ? (
                    <span className="flex items-center gap-1"><Target size={11} />Meta: {s.metaMensual}/mes</span>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <Modal onClose={() => setForm(null)} title={form.id ? "Editar persona" : "Nueva persona"}>
          <div className="space-y-3">
            <Field label="Nombre completo">
              <CampoTexto value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            </Field>
            <Field label="Grado">
              <CampoTexto value={form.role} onChange={(v) => setForm({ ...form, role: v })} placeholder="Ej: Suboficial, Oficial, Civil" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefono">
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
              </Field>
              <Field label="Correo">
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cumpleanos (dia/mes)">
                <input value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="input" placeholder="Ej: 14/03" />
              </Field>
              <Field label="Meta mensual (opcional)">
                <input type="number" min={0} value={form.metaMensual || ""} onChange={(e) => setForm({ ...form, metaMensual: e.target.value })} className="input" placeholder="Solo si tiene cuota fija" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className="text-sm px-3 py-1.5 rounded border border-slate-300">Cancelar</button>
              <button onClick={save} className="text-sm px-3 py-1.5 rounded bg-pnp-verde text-white">Guardar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- shared ---------- */
function Field({ label, children }) {
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
      <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
