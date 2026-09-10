// Corrector automatico de escritura en espanol.
// Solo corrige palabras que NO son ambiguas: se excluyen a proposito los casos
// donde las dos formas existen (el/el, si/si, solo/solo, esta/esta, publico/publico...),
// porque una correccion equivocada es peor que no corregir.

/* ---------- 1. tildes que faltan ---------- */
const TILDES = {
  administracion: "administración", adquisicion: "adquisición", analisis: "análisis",
  aplicacion: "aplicación", aprobacion: "aprobación", area: "área", articulo: "artículo",
  asi: "así", asignacion: "asignación", atencion: "atención", autorizacion: "autorización",
  basico: "básico", basica: "básica", capacitacion: "capacitación", caracteristica: "característica",
  caracteristicas: "características", categoria: "categoría", categorias: "categorías",
  certificacion: "certificación", clasificacion: "clasificación", codigo: "código", codigos: "códigos",
  comision: "comisión", comite: "comité", comunicacion: "comunicación", conclusion: "conclusión",
  condicion: "condición", condiciones: "condiciones", consideracion: "consideración",
  construccion: "construcción", contratacion: "contratación", contribucion: "contribución",
  coordinacion: "coordinación", correccion: "corrección", credito: "crédito", cronologico: "cronológico",
  decision: "decisión", declaracion: "declaración", definicion: "definición", delegacion: "delegación",
  demas: "demás", denominacion: "denominación", deposito: "depósito", descripcion: "descripción",
  designacion: "designación", despues: "después", deteccion: "detección", determinacion: "determinación",
  dia: "día", dias: "días", direccion: "dirección", disposicion: "disposición",
  distribucion: "distribución", division: "división", documentacion: "documentación",
  economico: "económico", edicion: "edición", educacion: "educación", ejecucion: "ejecución",
  elaboracion: "elaboración", electronico: "electrónico", electronica: "electrónica",
  eliminacion: "eliminación", emision: "emisión", epidemiologico: "epidemiológico",
  especifico: "específico", especifica: "específica", estadistica: "estadística",
  estadisticas: "estadísticas", estadistico: "estadístico", evaluacion: "evaluación",
  evolucion: "evolución", excepcion: "excepción", exoneracion: "exoneración", expedicion: "expedición",
  explicacion: "explicación", exposicion: "exposición", facil: "fácil", facturacion: "facturación",
  fisica: "física", formacion: "formación", formula: "fórmula", funcion: "función",
  generacion: "generación", geografico: "geográfico", gestion: "gestión", grafico: "gráfico",
  graficos: "gráficos", habil: "hábil", habiles: "hábiles", historico: "histórico",
  identificacion: "identificación", implementacion: "implementación", importacion: "importación",
  impresion: "impresión", inclusion: "inclusión", incorporacion: "incorporación",
  indicacion: "indicación", indice: "índice", informacion: "información", informatica: "informática",
  ingenieria: "ingeniería", inscripcion: "inscripción", inspeccion: "inspección",
  instalacion: "instalación", institucion: "institución", instruccion: "instrucción",
  integracion: "integración", interes: "interés", intervencion: "intervención",
  introduccion: "introducción", investigacion: "investigación", juridico: "jurídico",
  kilometro: "kilómetro", legislacion: "legislación", limite: "límite", limites: "límites",
  linea: "línea", lineas: "líneas", liquidacion: "liquidación", logistica: "logística",
  maquina: "máquina", matematica: "matemática", maximo: "máximo", medico: "médico",
  medicos: "médicos", memorandum: "memorándum", minimo: "mínimo", mision: "misión",
  modulo: "módulo", modulos: "módulos", motivacion: "motivación", multiple: "múltiple",
  nomina: "nómina", notificacion: "notificación", numero: "número", numeros: "números",
  numerico: "numérico", objecion: "objeción", obligacion: "obligación", observacion: "observación",
  observaciones: "observaciones", obtencion: "obtención", ocupacion: "ocupación", opcion: "opción",
  operacion: "operación", opinion: "opinión", organizacion: "organización", orientacion: "orientación",
  pagina: "página", paginas: "páginas", parrafo: "párrafo", participacion: "participación",
  pension: "pensión", percepcion: "percepción", planificacion: "planificación", poblacion: "población",
  policia: "policía", politica: "política", posicion: "posición", presentacion: "presentación",
  presion: "presión", prevencion: "prevención", prevision: "previsión", problematica: "problemática",
  produccion: "producción", programacion: "programación", promocion: "promoción",
  proporcion: "proporción", proposito: "propósito", proteccion: "protección", provision: "provisión",
  publicacion: "publicación", razon: "razón", recaudacion: "recaudación", recepcion: "recepción",
  recomendacion: "recomendación", recuperacion: "recuperación", reduccion: "reducción",
  regimen: "régimen", regulacion: "regulación", relacion: "relación", remision: "remisión",
  rendicion: "rendición", renovacion: "renovación", reparacion: "reparación", repeticion: "repetición",
  representacion: "representación", reproduccion: "reproducción", republica: "república",
  resolucion: "resolución", restriccion: "restricción", retencion: "retención", reunion: "reunión",
  reuniones: "reuniones", revision: "revisión", sancion: "sanción", satisfaccion: "satisfacción",
  seccion: "sección", segun: "según", seleccion: "selección", sesion: "sesión",
  simulacion: "simulación", sintesis: "síntesis", sistematico: "sistemático", situacion: "situación",
  solucion: "solución", subvencion: "subvención", supervision: "supervisión",
  sustitucion: "sustitución", tambien: "también", tecnica: "técnica", tecnico: "técnico",
  tecnicos: "técnicos", telefono: "teléfono", telefonos: "teléfonos", telefonico: "telefónico",
  termino: "término", terminos: "términos", titulo: "título", titulos: "títulos",
  tramite: "trámite", tramites: "trámites", tramitacion: "tramitación", transito: "tránsito",
  transmision: "transmisión", ubicacion: "ubicación", ultima: "última", ultimo: "último",
  ultimos: "últimos", ultimas: "últimas", union: "unión", utilizacion: "utilización",
  valoracion: "valoración", verificacion: "verificación", version: "versión", via: "vía",
  vision: "visión",
  // formas verbales inequivocas
  aprobo: "aprobó", atendio: "atendió", autorizo: "autorizó", comenzo: "comenzó",
  comunico: "comunicó", coordino: "coordinó", cumplio: "cumplió", culmino: "culminó",
  debera: "deberá", deberan: "deberán", deberia: "debería", derivo: "derivó", elaboro: "elaboró",
  emitio: "emitió", encontro: "encontró", entrego: "entregó", estan: "están", estara: "estará",
  estaran: "estarán", estaria: "estaría", ejecuto: "ejecutó", finalizo: "finalizó", firmo: "firmó",
  habia: "había", habra: "habrá", hara: "hará", haran: "harán", haria: "haría", informo: "informó",
  llego: "llegó", llamo: "llamó", mando: "mandó", notifico: "notificó",
  podra: "podrá", podran: "podrán", podria: "podría", presento: "presentó",
  quedo: "quedó", realizo: "realizó", recibio: "recibió", remitio: "remitió",
  respondio: "respondió", reviso: "revisó", sera: "será", seran: "serán", solicito: "solicitó",
  tendra: "tendrá", tendran: "tendrán", tendria: "tendría", tenia: "tenía",
  verifico: "verificó",
};

/* ---------- 2. errores de tipeo frecuentes ---------- */
const TIPEO = {
  docuemnto: "documento", docuemntos: "documentos", docuemntacion: "documentación",
  documetacion: "documentación", documentacon: "documentación", doucmento: "documento",
  documnto: "documento", documeto: "documento",
  informacon: "información", infomacion: "información", inforacion: "información",
  infromacion: "información", imformacion: "información",
  unidaes: "unidades", unidads: "unidades", unidaddes: "unidades",
  crago: "cargo", carog: "cargo",
  oficna: "oficina", oficnia: "oficina", ofcina: "oficina",
  persoal: "personal", personla: "personal",
  taera: "tarea", taeras: "tareas", trea: "tarea",
  reprote: "reporte", repote: "reporte", reportte: "reporte",
  repuesta: "respuesta", repsuesta: "respuesta", respuersta: "respuesta",
  solisitud: "solicitud", solicitu: "solicitud", solisitar: "solicitar",
  prosedimiento: "procedimiento", procedimeinto: "procedimiento", prosedimeinto: "procedimiento",
  espediente: "expediente", espedientes: "expedientes",
  memorandun: "memorándum", memoradum: "memorándum",
  recivo: "recibo", recivos: "recibos", onorarios: "honorarios",
  comformidad: "conformidad", confomidad: "conformidad",
  segimiento: "seguimiento", seguimeinto: "seguimiento",
  embiar: "enviar", embio: "envío",
  nesecito: "necesito", nesesito: "necesito", nesecita: "necesita", nesesita: "necesita",
  qeu: "que", quue: "que", pra: "para", prar: "para", opr: "por", oara: "para",
  ahi: "ahí", aca: "acá", haci: "así",
  cuidad: "ciudad", vaje: "viaje",
  ecribir: "escribir", escrbir: "escribir",
  contol: "control", contorl: "control",
  pendinte: "pendiente", pendietne: "pendiente",
  atrazado: "atrasado", atrazada: "atrasada",
  mansual: "mensual", menusal: "mensual",
  imforme: "informe", infome: "informe",
  firmma: "firma", verificasion: "verificación",
  locadr: "locador", locdor: "locador",
};

/* ---------- 3. nombres propios y siglas ---------- */
const PROPIOS = {
  peru: "Perú", pnp: "PNP", dirsapol: "DIRSAPOL", sgd: "SGD", dni: "DNI", ruc: "RUC",
  lima: "Lima", callao: "Callao", essalud: "EsSalud", minsa: "MINSA", mef: "MEF",
  sunat: "SUNAT", ugel: "UGEL",
};

export const DICCIONARIO = { ...TILDES, ...TIPEO, ...PROPIOS };

const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const RE_PALABRA = new RegExp(`[${LETRAS}]+`, "g");

function aplicarMayusculas(original, correccion) {
  // Nombre propio o sigla en el diccionario: se respeta tal cual.
  if (correccion[0] !== correccion[0].toLowerCase()) return correccion;
  if (original.length > 1 && original === original.toUpperCase()) return correccion.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return correccion[0].toUpperCase() + correccion.slice(1);
  return correccion;
}

/** Corrige solo las palabras, sin tocar espacios ni mayusculas de oracion. */
export function corregirPalabras(texto, extra = {}) {
  if (!texto) return { texto: texto || "", cambios: [] };
  const dicc = { ...DICCIONARIO, ...extra };
  const cambios = [];
  const salida = texto.replace(RE_PALABRA, (palabra) => {
    const corr = dicc[palabra.toLowerCase()];
    if (!corr) return palabra;
    const final = aplicarMayusculas(palabra, corr);
    if (final !== palabra) cambios.push({ de: palabra, a: final });
    return final;
  });
  return { texto: salida, cambios };
}

function arreglarEspaciado(texto) {
  return texto
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,;:.!?])/g, "$1")
    .replace(new RegExp(`([,;:])(?=[${LETRAS}])`, "g"), "$1 ")
    .replace(new RegExp(`([.!?])(?=[${LETRAS}]{2})`, "g"), "$1 ");
}

function mayusculaDeOracion(texto) {
  return texto
    .replace(new RegExp(`^\\s*([${LETRAS}])`), (m, l) => m.replace(l, l.toUpperCase()))
    .replace(new RegExp(`([.!?]\\s+)([${LETRAS}])`, "g"), (m, sep, l) => sep + l.toUpperCase());
}

/** Correccion completa: palabras + espaciado + mayuscula de oracion. */
export function corregirTexto(texto, opciones = {}) {
  const { extra = {}, mayusculas = true, espaciado = true } = opciones;
  if (!texto || !texto.trim()) return { texto: texto || "", cambios: [] };
  const r = corregirPalabras(texto, extra);
  let salida = r.texto;
  if (espaciado) salida = arreglarEspaciado(salida);
  if (mayusculas) salida = mayusculaDeOracion(salida);
  return { texto: salida, cambios: r.cambios };
}

/** Resumen legible de los cambios, para mostrarlo bajo el campo. */
export function resumenCambios(cambios) {
  if (!cambios.length) return "";
  const vistos = [];
  cambios.forEach((c) => {
    const t = `${c.de} → ${c.a}`;
    if (!vistos.includes(t)) vistos.push(t);
  });
  return vistos.slice(0, 3).join(" · ") + (vistos.length > 3 ? ` y ${vistos.length - 3} mas` : "");
}

export function totalPalabrasDiccionario() {
  return Object.keys(DICCIONARIO).length;
}
