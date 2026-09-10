import { createContext, useContext, useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { corregirPalabras, corregirTexto, resumenCambios } from "../lib/corrector";

const CorreccionContext = createContext({ activo: true, extra: {} });

export function CorreccionProvider({ activo = true, extra = {}, children }) {
  return <CorreccionContext.Provider value={{ activo, extra }}>{children}</CorreccionContext.Provider>;
}

export function useCorreccion() {
  return useContext(CorreccionContext);
}

const SEPARADORES = [" ", ",", ".", ";", ":", "!", "?", ")", "\n"];

/**
 * Campo de texto con correccion automatica en espanol.
 * - Mientras escribes: corrige la palabra recien terminada (al pulsar espacio o puntuacion),
 *   solo si el cursor esta al final, para no moverte el cursor si estas editando en medio.
 * - Al salir del campo: corrige todo, arregla espacios y pone mayuscula de inicio de oracion.
 */
export default function CampoTexto({
  value,
  onChange,
  multiline = false,
  rows = 2,
  className = "input",
  mayusculas = true,
  ...props
}) {
  const { activo, extra } = useCorreccion();
  const [aviso, setAviso] = useState("");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function mostrarAviso(cambios) {
    if (!cambios.length) return;
    setAviso(resumenCambios(cambios));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(""), 4000);
  }

  function alEscribir(e) {
    const v = e.target.value;
    if (!activo) {
      onChange(v);
      return;
    }
    const alFinal = e.target.selectionStart === v.length;
    const ultimo = v.slice(-1);
    if (alFinal && SEPARADORES.includes(ultimo)) {
      const r = corregirPalabras(v, extra);
      if (r.texto !== v) {
        onChange(r.texto);
        mostrarAviso(r.cambios);
        return;
      }
    }
    onChange(v);
  }

  function alSalir(e) {
    if (!activo) return;
    const r = corregirTexto(e.target.value, { extra, mayusculas });
    if (r.texto !== e.target.value) {
      onChange(r.texto);
      mostrarAviso(r.cambios);
    }
    props.onBlur?.(e);
  }

  const comunes = {
    lang: "es",
    spellCheck: true,
    ...props,
    value: value || "",
    onChange: alEscribir,
    onBlur: alSalir,
    className,
  };

  return (
    <>
      {multiline ? <textarea rows={rows} {...comunes} /> : <input {...comunes} />}
      {aviso && (
        <span className="flex items-center gap-1 text-[11px] text-emerald-700 mt-0.5">
          <Check size={11} /> {aviso}
        </span>
      )}
    </>
  );
}
