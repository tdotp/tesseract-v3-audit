// Salida del log del motor geométrico (A6.2, D-A6-4): ÚNICO estado de módulo de core/. main.js la conecta a su log() al arrancar;
// sin conectar no escribe nada. Las funciones del motor siguen llamando a log(m) con el mismo texto y en el mismo orden.
var sink = null;
export function setLogSink(fn){ sink = (typeof fn === 'function') ? fn : null; }
export function log(m){ if(sink) sink(m); }
