import {
  LayoutDashboard,
  ClipboardList,
  MailCheck,
  Briefcase,
  FileBarChart,
  Table2,
  TrendingUp,
  Archive,
  Users,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { fmtDate, todayStr } from "../lib/fechas";

/* Emblema institucional: escudo en verde y oro PNP, caduceo de Sanidad
   y barras de Estadistica. Diseno propio de la aplicacion, no reproduce
   el escudo oficial. */
export function Emblema({ size = 46 }) {
  return (
    <svg width={size} height={(size * 52) / 46} viewBox="0 0 46 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M23 1.5 L43 8.5 V25 C43 38 34.5 47 23 50.5 C11.5 47 3 38 3 25 V8.5 Z"
        fill="#14532d"
        stroke="#c8a951"
        strokeWidth="2"
      />
      <path
        d="M23 5 L39.5 10.8 V25 C39.5 36 32.5 43.8 23 47 C13.5 43.8 6.5 36 6.5 25 V10.8 Z"
        fill="none"
        stroke="#c8a951"
        strokeWidth="0.7"
        opacity="0.55"
      />
      {/* caduceo simplificado */}
      <line x1="23" y1="11" x2="23" y2="24" stroke="#e3c96a" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="23" cy="10" r="1.5" fill="#e3c96a" />
      <path d="M19.5 13 Q23 15.5 26.5 13" fill="none" stroke="#e3c96a" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M19.5 17 Q23 19.5 26.5 17" fill="none" stroke="#e3c96a" strokeWidth="1.1" strokeLinecap="round" />
      {/* barras de estadistica */}
      <rect x="13" y="33" width="5" height="8" rx="0.6" fill="#f8fafc" />
      <rect x="20.5" y="28" width="5" height="13" rx="0.6" fill="#f8fafc" />
      <rect x="28" y="23.5" width="5" height="17.5" rx="0.6" fill="#e3c96a" />
      <line x1="11" y1="42.5" x2="35" y2="42.5" stroke="#c8a951" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export default function Portada({ tab, setTab, overdueCount, docsVencidos = 0, alertaRespaldo, onSalir }) {
  const tabs = [
    { id: "panel", label: "Panel", icon: LayoutDashboard },
    { id: "tareas", label: "Tareas", icon: ClipboardList },
    { id: "documentos", label: "Correspondencia", icon: MailCheck },
    { id: "locadores", label: "Locadores", icon: Briefcase },
    { id: "reportes", label: "Reportes", icon: FileBarChart },
    { id: "consolidado", label: "Consolidado", icon: Table2 },
    { id: "desempeno", label: "Desempeno", icon: TrendingUp },
    { id: "archivo", label: "Archivo fisico", icon: Archive },
    { id: "personal", label: "Personal", icon: Users },
    { id: "respaldo", label: "Respaldo", icon: ShieldCheck },
  ];

  return (
    <header>
      <div className="bg-pnp-verde text-white">
        <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4">
          <Emblema />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] tracking-[0.18em] text-pnp-oro uppercase leading-tight">
              Policia Nacional del Peru
            </p>
            <h1 className="font-serif text-lg sm:text-xl leading-tight truncate">
              DIRSAPOL · Direccion de Sanidad Policial
            </h1>
            <p className="text-xs text-emerald-100/80 leading-tight">Oficina de Estadistica · Gestion de oficina</p>
          </div>
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-[10px] tracking-[0.14em] text-pnp-oro uppercase leading-tight">Dios · Patria · Ley</p>
            <p className="text-xs text-emerald-100/80 leading-tight mt-0.5">{fmtDate(todayStr())}</p>
          </div>
          {onSalir && (
            <button
              onClick={onSalir}
              title="Cerrar sesion"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-emerald-100/40 text-emerald-50 hover:bg-white/10 shrink-0"
            >
              <LogOut size={14} /> <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
        <div className="h-1 bg-gradient-to-r from-pnp-oro via-pnp-oro-claro to-pnp-oro" />
      </div>

      <nav className="flex gap-1 px-4 sm:px-6 pt-2 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-t border-b-2 whitespace-nowrap ${
                active
                  ? "border-pnp-verde text-pnp-verde bg-emerald-50/60 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={15} />
              {t.label}
              {t.id === "tareas" && overdueCount > 0 && (
                <span className="ml-1 text-xs bg-rose-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                  {overdueCount}
                </span>
              )}
              {t.id === "documentos" && docsVencidos > 0 && (
                <span className="ml-1 text-xs bg-rose-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                  {docsVencidos}
                </span>
              )}
              {t.id === "respaldo" && alertaRespaldo && (
                <span className="ml-1 w-2 h-2 rounded-full bg-amber-500" title="Respaldo pendiente" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
