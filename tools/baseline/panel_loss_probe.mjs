// Diagnóstico: por qué el filtro de conectividad del plugin descarta 2 de 13 paneles en caja-botanica-real.json.
// Imprime las creases que no emparejan en buildAdjacencyStrict y los vértices de panel que caen a ~0.5 mm de sus extremos.
// Requiere dos variables de entorno:
//   PLUGIN_MAIN  ruta al main.js del plugin (SOLO LECTURA; se extraen funciones puras por rango de líneas)
//   WEB_DIR      raíz de una COPIA de tesseract-web ya construida (pnpm build) -> packages/core/dist
// Los rangos de línea (550-556, 648-776, 977-1194, 1316-1348) corresponden al main.js de 2656 líneas
// ("Phase 7B"). Si el plugin cambia, hay que revisar los rangos.
// Uso:  PLUGIN_MAIN=... WEB_DIR=... node panel_loss_probe.mjs
import fs from 'node:fs'; import vm from 'node:vm';
const PLUGIN=process.env.PLUGIN_MAIN, WEB=process.env.WEB_DIR;
const lines=fs.readFileSync(PLUGIN,'utf8').split('\n'); const sl=(a,b)=>lines.slice(a-1,b).join('\n');
let body=[sl(550,556),sl(648,776),sl(977,1194),sl(1316,1348)].join('\n');
body=body.replace('var adjEdges = buildAdjacencyStrict(panels, creaseEdges);','DBG.panels=panels; DBG.ce=creaseEdges; var adjEdges = buildAdjacencyStrict(panels, creaseEdges);');
const src='var GRAPH_EPS=0.5; var DBG={}; function log(m){}\n'+body+'\nthis.buildPanels=buildPanels; this.DBG=DBG;';
const sb={}; vm.createContext(sb); vm.runInContext('(function(){'+src+'}).call(this)',sb);
const real=JSON.parse(fs.readFileSync(WEB+'/packages/core/src/__tests__/fixtures/caja-botanica-real.json','utf8'));
sb.buildPanels(real);
const {panels,ce}=sb.DBG; const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(const ci of [7,10]){ const segs=ce.filter(c=>c.creaseIdx===ci); console.log('crease',ci,'segmentos',segs.length, segs.map(s=>`(${s.a.x.toFixed(2)},${s.a.y.toFixed(2)})->(${s.b.x.toFixed(2)},${s.b.y.toFixed(2)}) len ${d(s.a,s.b).toFixed(2)}`).join(' | '));
  for(const s of segs){ // paneles que tienen ambos extremos como vértices (a <0.5) pero NO consecutivos / o aristas parciales
    const best=panels.map((p,pi)=>{ const ia=p.vertices.findIndex(v=>d(v,s.a)<0.5), ib=p.vertices.findIndex(v=>d(v,s.b)<0.5); return {pi,ia,ib}; }).filter(x=>x.ia>=0||x.ib>=0); console.log('  paneles que tocan algún extremo:',JSON.stringify(best)); } }
function distPtSeg(p,a,b){const l2=(b.x-a.x)**2+(b.y-a.y)**2;let t=((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-(a.x+t*(b.x-a.x)),p.y-(a.y+t*(b.y-a.y)))}
for(const ci of [7,10]){ const s=ce.find(c=>c.creaseIdx===ci); const interior=[];
  panels.forEach((p,pi)=>p.vertices.forEach(v=>{ if(distPtSeg(v,s.a,s.b)<0.5 && d(v,s.a)>0.5 && d(v,s.b)>0.5) interior.push({pi,x:+v.x.toFixed(2),y:+v.y.toFixed(2)}); }));
  console.log('crease',ci,': vértices de panel dentro de 0.5 mm del segmento pero NO en sus extremos (el grafo fusionó el vértice a ~0.5 mm del extremo de la crease):',JSON.stringify(interior)); }
