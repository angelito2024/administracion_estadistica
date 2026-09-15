import { useState } from "react";
import { Eye, EyeOff, KeyRound, LogIn, LogOut, UserRound } from "lucide-react";
import { Emblema } from "./Portada";
import {
  hayAcceso,
  leerAcceso,
  crearAcceso,
  verificarAcceso,
  cambiarClave,
  abrirSesion,
  CLAVE_MINIMA,
} from "../lib/acceso";

const MAX_INTENTOS = 5;
const BLOQUEO_SEG = 30;

/** Campo de clave con boton para verla. */
function CampoClave({ value, onChange, placeholder, autoFocus }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input
        type={ver ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="input pr-9"
      />
      <button
        type="button"
        onClick={() => setVer(!ver)}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        title={ver ? "Ocultar clave" : "Ver clave"}
      >
        {ver ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

/** Pantalla completa: primera vez crea el acceso; despues pide usuario y clave. */
export default function PantallaAcceso({ onEntrar }) {
  const primeraVez = !hayAcceso();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(0);

  const segundosBloqueo = Math.max(0, Math.ceil((bloqueadoHasta - Date.now()) / 1000));

  async function enviar(e) {
    e.preventDefault();
    setError("");
    if (segundosBloqueo > 0) return;
    setOcupado(true);
    try {
      if (primeraVez) {
        if (clave !== confirmar) throw new Error("Las claves no coinciden.");
        await crearAcceso(usuario, clave);
        abrirSesion();
        onEntrar();
        return;
      }
      const ok = await verificarAcceso(usuario, clave);
      if (!ok) {
        const n = intentos + 1;
        setIntentos(n);
        setClave("");
        if (n >= MAX_INTENTOS) {
          setBloqueadoHasta(Date.now() + BLOQUEO_SEG * 1000);
          setIntentos(0);
          setTimeout(() => setBloqueadoHasta(0), BLOQUEO_SEG * 1000);
          throw new Error(`Demasiados intentos. Espera ${BLOQUEO_SEG} segundos.`);
        }
        throw new Error(`Usuario o clave incorrectos (intento ${n} de ${MAX_INTENTOS}).`);
      }
      abrirSesion();
      onEntrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-pnp-verde text-white px-6 py-5 flex items-center gap-3">
          <Emblema size={40} />
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.18em] text-pnp-oro uppercase leading-tight">Policia Nacional del Peru</p>
            <h1 className="font-serif text-base leading-tight">DIRSAPOL · Oficina de Estadistica</h1>
            <p className="text-xs text-emerald-100/80 leading-tight">Gestion de oficina</p>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-pnp-oro via-pnp-oro-claro to-pnp-oro" />

        <form onSubmit={enviar} className="p-6 space-y-4">
          {primeraVez ? (
            <div className="text-sm text-slate-700">
              <p className="font-medium text-slate-900 mb-1">Configura el acceso</p>
              <p className="text-xs text-slate-500">
                Es la primera vez que se abre en esta PC. Crea el usuario y la clave con los que se
                ingresara de ahora en adelante. Guardalos en un lugar seguro: no hay forma de recuperarlos.
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-slate-900">Ingresa para continuar</p>
          )}

          <label className="block">
            <span className="block text-xs text-slate-500 mb-1">Usuario</span>
            <div className="relative">
              <UserRound size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoFocus
                autoComplete="username"
                className="input pl-8"
                placeholder="Ej: estadistica"
              />
            </div>
          </label>

          <label className="block">
            <span className="block text-xs text-slate-500 mb-1">Clave</span>
            <CampoClave value={clave} onChange={setClave} placeholder={primeraVez ? `Minimo ${CLAVE_MINIMA} caracteres` : ""} />
          </label>

          {primeraVez && (
            <label className="block">
              <span className="block text-xs text-slate-500 mb-1">Repite la clave</span>
              <CampoClave value={confirmar} onChange={setConfirmar} />
            </label>
          )}

          {error && (
            <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={ocupado || segundosBloqueo > 0}
            className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 rounded bg-pnp-verde text-white hover:bg-pnp-verde-claro disabled:opacity-50"
          >
            {primeraVez ? <KeyRound size={15} /> : <LogIn size={15} />}
            {segundosBloqueo > 0 ? `Bloqueado ${segundosBloqueo}s` : primeraVez ? "Crear acceso" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Bloque para la pestaña Respaldo: usuario actual, cambio de clave y cierre de sesion. */
export function CuentaAcceso({ onSalir }) {
  const acceso = leerAcceso();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function cambiar(e) {
    e.preventDefault();
    setMensaje(null);
    if (nueva !== confirmar) {
      setMensaje({ tipo: "error", texto: "Las claves nuevas no coinciden." });
      return;
    }
    setOcupado(true);
    try {
      await cambiarClave(actual, nueva);
      setActual("");
      setNueva("");
      setConfirmar("");
      setMensaje({ tipo: "ok", texto: "Clave cambiada. Usala desde el proximo ingreso." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="border-t border-slate-200 pt-4 mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="text-sm font-medium text-slate-700">Acceso a la aplicacion</h3>
          <p className="text-xs text-slate-500">
            Usuario: <b className="text-slate-700">{acceso?.usuario || "—"}</b>. La clave se guarda cifrada en esta PC y
            no se incluye en el archivo de respaldo.
          </p>
        </div>
        <button
          onClick={onSalir}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:border-rose-400 hover:text-rose-700"
        >
          <LogOut size={14} /> Cerrar sesion
        </button>
      </div>

      <form onSubmit={cambiar} className="grid sm:grid-cols-3 gap-3 max-w-2xl">
        <label className="block">
          <span className="block text-xs text-slate-500 mb-1">Clave actual</span>
          <CampoClave value={actual} onChange={setActual} />
        </label>
        <label className="block">
          <span className="block text-xs text-slate-500 mb-1">Clave nueva</span>
          <CampoClave value={nueva} onChange={setNueva} placeholder={`Minimo ${CLAVE_MINIMA}`} />
        </label>
        <label className="block">
          <span className="block text-xs text-slate-500 mb-1">Repite la nueva</span>
          <CampoClave value={confirmar} onChange={setConfirmar} />
        </label>
        <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={ocupado || !actual || !nueva}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded bg-pnp-verde text-white disabled:opacity-40"
          >
            <KeyRound size={14} /> Cambiar clave
          </button>
          {mensaje && (
            <span className={`text-xs ${mensaje.tipo === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{mensaje.texto}</span>
          )}
        </div>
      </form>
    </div>
  );
}
