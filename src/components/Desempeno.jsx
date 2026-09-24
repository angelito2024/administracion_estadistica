import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Download, Target, AlertTriangle, Clock, CalendarClock, PauseCircle } from "lucide-react";
import { daysDiff, diffDays, lastNMonths, monthLabel, monthKey } from "../lib/fechas";
import { controlesSinAvance } from "./Seguimiento";
import { exportarDesempenoCSV } from "../lib/respaldo";

const PERIODOS = [
  { id: "mes", label: "Este mes", meses: 1 },
  { id: "3m", label: "Ultimos 3 meses", meses: 3 },
  { id: "6m", label: "Ultimos 6 meses", meses: 6 },
  { id: "todo", label: "Todo", meses: null },
];

const ESTADOS = {
  cumple: { label: "Al dia", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  aceptable: { label: "Aceptable", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  bajo: { label: "Bajo", cls: "bg-rose-50 text-rose-800 border-rose-200" },
  sincarga: { label: "Sin carga", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

function situacion(cumplimiento, asignadas) {
  if (!asignadas) return ESTADOS.sincarga;
  if (cumplimiento >= 90) return ESTADOS.cumple;
  if (cumplimiento >= 70) return ESTADOS.aceptable;
  return ESTADOS.bajo;
}

function pct(parte, total) {
  return total ? Math.round((parte / total) * 100) : null;
}

/**
 * Fecha con la que se juzga si una tarea llego a tiempo: la primera que se fijo.
 * `fechaOriginal` solo existe cuando la tarea se reprogramo alguna vez.
 */
function fechaComprometida(t) {
  return t.fechaOriginal || t.dueDate;
}

export default function Desempeno({ data, goTo }) {
  const [periodo, setPeriodo] = useState("mes");
  const cfg = PERIODOS.find((p) => p.id === periodo);

  const mesesPeriodo = useMemo(() => (cfg.meses ? lastNMonths(cfg.meses) : null), [cfg.meses]);
  const mesesEvolucion = useMemo(() => lastNMonths(6), []);

  const filas = useMemo(() => {
    const enPeriodo = (fecha) => {
      if (!mesesPeriodo) return true;
      if (!fecha) return false;
      return mesesPeriodo.includes(fecha.slice(0, 7));
    };

    return data.staff.map((persona) => {
      const suyas = data.tasks.filter((t) => t.assignedTo === persona.id);
      const carga = suyas.filter((t) => enPeriodo(t.dueDate));

      const completadas = carga.filter((t) => t.status === "completado");
      // La puntualidad se mide contra la fecha COMPROMETIDA (la primera), no contra
      // la ultima reprogramacion: si no, mover la fecha borraria el incumplimiento.
      const aTiempo = completadas.filter((t) => t.completedAt && fechaComprometida(t) && t.completedAt <= fechaComprometida(t)).length;
      const tarde = completadas.length - aTiempo;
      // Entregadas tarde que se habrian dado por buenas mirando solo la fecha vigente.
      const tardeTrasReprogramar = completadas.filter(
        (t) => t.completedAt && t.dueDate && t.completedAt <= t.dueDate && fechaComprometida(t) < t.completedAt
      ).length;
      const diasDeRetraso = completadas.reduce((s, t) => {
        const d = diffDays(fechaComprometida(t), t.completedAt);
        return s + (isNaN(d) || d <= 0 ? 0 : d);
      }, 0);
      const sinTerminar = carga.filter((t) => t.status !== "completado");
      const pendientes = sinTerminar.length;
      // Respeta el periodo elegido, igual que el resto de las cifras de la tarjeta.
      const atrasadas = carga.filter((t) => t.status !== "completado" && daysDiff(t.dueDate) < 0).length;

      // Cuantas tuvo que mover de fecha y en que porcentaje va lo que sigue abierto.
      const reprogramadas = carga.filter((t) => (t.reprogramaciones || []).length > 0).length;
      // Veces que se controlo una tarea suya y seguia en el mismo punto.
      const sinAvance = carga.reduce((s, t) => s + controlesSinAvance(t).total, 0);
      const avancePendientes = sinTerminar.length
        ? Math.round(sinTerminar.reduce((s, t) => s + (Number(t.avance) || 0), 0) / sinTerminar.length)
        : null;

      const duraciones = completadas
        .filter((t) => t.createdAt && t.completedAt)
        .map((t) => Math.max(diffDays(t.createdAt, t.completedAt), 0));
      const promedioDias = duraciones.length
        ? Math.round((duraciones.reduce((a, b) => a + b, 0) / duraciones.length) * 10) / 10
        : null;

      const cumplimiento = pct(completadas.length, carga.length);
      const metaMensual = parseInt(persona.metaMensual || 0, 10) || 0;
      const nMeses = mesesPeriodo ? mesesPeriodo.length : 1;
      const meta = metaMensual ? metaMensual * nMeses : 0;

      const porMes = mesesEvolucion.map((mk) => ({
        mk,
        n: suyas.filter((t) => t.status === "completado" && (t.completedAt || "").slice(0, 7) === mk).length,
      }));

      // Referencia propia: como casi todo el trabajo llega por demanda, la vara de
      // comparacion mas justa es el promedio de la misma persona en los 3 meses previos.
      const previos = porMes.slice(-4, -1);
      const promedioPropio = previos.length
        ? Math.round((previos.reduce((a, m) => a + m.n, 0) / previos.length) * 10) / 10
        : 0;
      const esteMes = porMes.length ? porMes[porMes.length - 1].n : 0;
      const variacion = promedioPropio > 0 ? Math.round(((esteMes - promedioPropio) / promedioPropio) * 100) : null;

      return {
        persona,
        asignadas: carga.length,
        completadas: completadas.length,
        aTiempo,
        tarde,
        tardeTrasReprogramar,
        diasDeRetraso,
        pendientes,
        atrasadas,
        reprogramadas,
        sinAvance,
        avancePendientes,
        cumplimiento,
        puntualidad: pct(aTiempo, completadas.length),
        promedioDias,
        meta,
        avanceMeta: meta ? Math.round((completadas.length / meta) * 100) : null,
        estado: situacion(cumplimiento === null ? 0 : cumplimiento, carga.length),
        porMes,
        promedioPropio,
        esteMes,
        variacion,
      };
    });
  }, [data.staff, data.tasks, mesesPeriodo, mesesEvolucion]);

  const ranking = useMemo(
    () => [...filas].sort((a, b) => b.completadas - a.completadas || (b.cumplimiento || 0) - (a.cumplimiento || 0)),
    [filas]
  );

  const totalCompletadas = filas.reduce((s, f) => s + f.completadas, 0);
  const totalAsignadas = filas.reduce((s, f) => s + f.asignadas, 0);
  const totalATiempo = filas.reduce((s, f) => s + f.aTiempo, 0);
  const promedioEquipo = filas.length ? Math.round((totalCompletadas / filas.length) * 10) / 10 : 0;
  const maxCompletadas = Math.max(1, ...filas.map((f) => f.completadas));
  const conCarga = ranking.filter((f) => f.asignadas > 0);

  if (data.staff.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-serif text-lg text-slate-800 mb-1">Aun no hay personal registrado</p>
        <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
          Para medir el trabajo primero registra a tu personal y asignale tareas.
        </p>
        <button onClick={() => goTo("personal")} className="text-sm bg-pnp-verde text-white rounded px-4 py-2">
          Ir a Personal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                periodo === p.id ? "bg-pnp-verde text-white border-pnp-verde" : "border-slate-300 text-slate-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportarDesempenoCSV(ranking, periodo)}
          className="flex items-center gap-1 text-sm border border-slate-300 text-slate-600 rounded px-3 py-1.5"
        >
          <Download size={15} /> Exportar a Excel
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tarjeta label="Trabajo recibido" valor={totalAsignadas} />
        <Tarjeta label="Atendido" valor={totalCompletadas} />
        <Tarjeta
          label="Capacidad de respuesta"
          valor={pct(totalCompletadas, totalAsignadas) === null ? "—" : pct(totalCompletadas, totalAsignadas) + "%"}
        />
        <Tarjeta
          label="Entregadas a tiempo"
          valor={pct(totalATiempo, totalCompletadas) === null ? "—" : pct(totalATiempo, totalCompletadas) + "%"}
        />
      </div>

      {totalAsignadas === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded">
          No hay tareas con fecha limite dentro de este periodo. Prueba con un periodo mas amplio.
        </p>
      ) : (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-1">Produccion por persona</h3>
          <p className="text-xs text-slate-500 mb-3">
            Tareas atendidas en el periodo. Como el trabajo llega por demanda, la referencia es el promedio del
            equipo ({promedioEquipo}): en verde quienes estan por encima, en ambar quienes estan por debajo.
          </p>
          <div className="space-y-2">
            {ranking.map((f, i) => (
              <div key={f.persona.id} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                <span className="text-xs text-slate-700 w-32 sm:w-40 truncate shrink-0">{f.persona.name}</span>
                <div className="flex-1 bg-slate-100 rounded h-5 overflow-hidden">
                  <div
                    className={`h-full rounded ${f.completadas >= promedioEquipo ? "bg-pnp-verde" : "bg-amber-400"}`}
                    style={{ width: `${Math.max((f.completadas / maxCompletadas) * 100, f.completadas ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-600 w-8 text-right shrink-0">{f.completadas}</span>
              </div>
            ))}
          </div>
          {conCarga.length > 1 && (
            <div className="flex gap-4 mt-3 text-xs flex-wrap">
              <span className="flex items-center gap-1 text-emerald-700">
                <TrendingUp size={13} /> Mayor produccion: <b>{conCarga[0].persona.name}</b> ({conCarga[0].completadas})
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <TrendingDown size={13} /> Menor produccion: <b>{conCarga[conCarga.length - 1].persona.name}</b> (
                {conCarga[conCarga.length - 1].completadas})
              </span>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">Detalle y evolucion de cada persona</h3>
        <div className="space-y-3">
          {ranking.map((f) => (
            <FichaPersona key={f.persona.id} f={f} mesesEvolucion={mesesEvolucion} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tarjeta({ label, valor }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-serif text-slate-900">{valor}</p>
    </div>
  );
}

function FichaPersona({ f, mesesEvolucion }) {
  const maxMes = Math.max(1, ...f.porMes.map((m) => m.n));
  const mesActual = monthKey();

  return (
    <div className="border border-slate-200 rounded p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{f.persona.name}</p>
          <p className="text-xs text-slate-500">{f.persona.role || "Sin grado registrado"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {f.reprogramadas > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              <CalendarClock size={11} /> {f.reprogramadas} reprogramada(s)
            </span>
          )}
          {f.atrasadas > 0 && (
            <span className="flex items-center gap-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
              <AlertTriangle size={11} /> {f.atrasadas} atrasada(s)
            </span>
          )}
          {f.sinAvance > 0 && (
            <span className="flex items-center gap-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
              <PauseCircle size={11} /> {f.sinAvance} control(es) sin avance
            </span>
          )}
          {f.avancePendientes !== null && f.pendientes > 0 && (
            <span className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
              Lo pendiente va al {f.avancePendientes}%
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded border ${f.estado.cls}`}>{f.estado.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-x-3 gap-y-2 mt-3">
        <Dato label="Le llegaron" valor={f.asignadas} />
        <Dato label="Atendidas" valor={f.completadas} />
        <Dato label="Pendientes" valor={f.pendientes} />
        <Dato label="Respondio el" valor={f.cumplimiento === null ? "—" : f.cumplimiento + "%"} />
        <Dato label="A tiempo" valor={f.puntualidad === null ? "—" : f.puntualidad + "%"} />
        <Dato label="Dias promedio" valor={f.promedioDias === null ? "—" : f.promedioDias} />
      </div>

      {f.tardeTrasReprogramar > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2 flex items-start gap-1.5">
          <CalendarClock size={12} className="mt-0.5 shrink-0" />
          <span>
            {f.tardeTrasReprogramar} tarea(s) se entregaron dentro de una fecha reprogramada, pero fuera de la
            fecha que se comprometio al inicio. Aqui cuentan como fuera de plazo.
            {f.diasDeRetraso > 0 && ` Retraso acumulado: ${f.diasDeRetraso} dia(s).`}
          </span>
        </p>
      )}

      {f.meta > 0 ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Target size={12} /> Meta del periodo: {f.completadas} de {f.meta}
            </span>
            <span className={f.avanceMeta >= 100 ? "text-emerald-700" : f.avanceMeta >= 70 ? "text-amber-700" : "text-rose-700"}>
              {f.avanceMeta}%
            </span>
          </div>
          <div className="bg-slate-100 rounded h-2 overflow-hidden">
            <div
              className={`h-full ${f.avanceMeta >= 100 ? "bg-emerald-600" : f.avanceMeta >= 70 ? "bg-amber-400" : "bg-rose-400"}`}
              style={{ width: `${Math.min(f.avanceMeta, 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
            <Target size={12} />
            <span>Trabajo a demanda — se compara contra su propio promedio:</span>
            {f.promedioPropio > 0 ? (
              <>
                <b className="text-slate-700">{f.promedioPropio} tareas/mes</b>
                <span>en los 3 meses previos · este mes {f.esteMes}</span>
                {f.variacion !== null && (
                  <span
                    className={`flex items-center gap-0.5 font-medium ${
                      f.variacion > 0 ? "text-emerald-700" : f.variacion < 0 ? "text-rose-700" : "text-slate-500"
                    }`}
                  >
                    {f.variacion > 0 ? <TrendingUp size={12} /> : f.variacion < 0 ? <TrendingDown size={12} /> : null}
                    {f.variacion > 0 ? "+" : ""}
                    {f.variacion}%
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-400">aun no hay meses previos para comparar</span>
            )}
          </p>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
          <Clock size={12} /> Evolucion de tareas completadas, ultimos 6 meses
        </p>
        <div className="flex items-end gap-2 h-16">
          {f.porMes.map((m) => (
            <div key={m.mk} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[10px] text-slate-400 leading-none mb-0.5">{m.n}</span>
              <div
                className={`w-full rounded-t ${m.mk === mesActual ? "bg-pnp-verde" : "bg-slate-300"}`}
                style={{ height: `${Math.max((m.n / maxMes) * 100, 3)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {mesesEvolucion.map((mk) => (
            <span key={mk} className="flex-1 text-center text-[10px] text-slate-400">
              {monthLabel(mk).slice(0, 3)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dato({ label, valor }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
      <p className="text-sm text-slate-900">{valor}</p>
    </div>
  );
}
