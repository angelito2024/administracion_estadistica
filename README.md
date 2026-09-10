# Gestion de oficina

App de escritorio/web para gestionar tareas, reportes, personal y archivo de la oficina.

## Requisitos

- Tener instalado Node.js (version 18 o superior). Descargar en https://nodejs.org
  (durante la instalacion, dejar todas las opciones por defecto)

## Primera vez: instalar dependencias

1. Abrir esta carpeta en VS Code (Archivo > Abrir carpeta).
2. Abrir una terminal dentro de VS Code (Terminal > Nueva terminal).
3. Ejecutar:

   npm install

   Esto descarga las librerias necesarias (React, Tailwind, iconos). Solo se hace una vez.

## Usar la app mientras se trabaja en ella (modo desarrollo)

   npm run dev

Va a mostrar una direccion como http://localhost:5173 — abrirla en el navegador (Chrome, Edge).
Cada vez que quieras usar la app, abres la terminal y corres este comando de nuevo.

## Dejarla lista para instalar en una PC de la oficina (sin necesitar VS Code despues)

   npm run build

Esto genera una carpeta "dist" con la app ya compilada (HTML, CSS, JS). Esa carpeta es lo que se
copia a la PC de la oficina. Para abrirla, no basta con hacer doble clic al archivo index.html
directamente (los navegadores bloquean algunas cosas al abrir archivos sueltos); lo mas simple es:

- Instalar la extension "Live Server" en VS Code, abrir la carpeta "dist" y darle clic derecho a
  index.html > "Open with Live Server". O,
- Instalar Node en esa PC y correr, dentro de la carpeta "dist": npx serve .
  Eso deja la app corriendo en una direccion local que se puede abrir cada vez desde el navegador.

## Sobre el guardado de datos

La app guarda todo (tareas, personal, reportes, archivo) en el almacenamiento local del navegador
(localStorage) de esa PC. Esto quiere decir:

- Los datos quedan guardados en esa computadora especifica y ese navegador especifico, aunque se
  cierre y se vuelva a abrir.
- Si se abre la app desde otra PC o otro navegador, no vera los mismos datos (no hay una base de
  datos compartida en esta version).
- Si se borra el historial/datos de navegacion del navegador, se pierde la informacion. Conviene
  hacer una copia de respaldo de vez en cuando (se puede agregar una funcion de exportar/importar
  si se necesita).

Si mas adelante se quiere que varias personas de la oficina vean la misma informacion desde
distintas PCs, se necesitaria una base de datos real (backend) en vez de localStorage — avisar
para adaptarlo.
