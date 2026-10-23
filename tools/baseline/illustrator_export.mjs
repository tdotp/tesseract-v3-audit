// Ambos motores sobre la exportación REAL de Illustrator + experimento de fusión de extremos de crease (<=0.5 mm).
// Requiere dos variables de entorno:
//   PLUGIN_MAIN  ruta al main.js del plugin (SOLO LECTURA; se extraen funciones puras por rango de líneas)
//   WEB_DIR      raíz de una COPIA de tesseract-web ya construida (pnpm build) -> packages/core/dist
// Los rangos de línea (550-556, 648-776, 977-1194, 1316-1348) corresponden al main.js de 2656 líneas
// ("Phase 7B"). Si el plugin cambia, hay que revisar los rangos.
// Uso:  PLUGIN_MAIN=... WEB_DIR=... node illustrator_export.mjs
import fs from 'node:fs'; import vm from 'node:vm';
const PLUGIN=process.env.PLUGIN_MAIN, WEB=process.env.WEB_DIR;
const core=await import(WEB+'/packages/core/dist/index.js');
const svg=fs.readFileSync(WEB+'/packages/core/src/__tests__/fixtures/caja-botanica-illustrator-export.svg','utf8');
const input=core.parseDieline(svg);
console.log('parse OK: outer pts',input.outerBoundary.points.length,'creases',input.creases.length,'holes',(input.holes||[]).length);
try{ const t=core.buildFoldTopology(input); console.log('core directo: OK',t.panels.length); }catch(e){ console.log('core directo: FALLA ->',e.message.slice(0,110)); }
// Experimento (solo scratchpad): fusionar extremos de crease entre sí a <=0.5 mm (centroide del cluster)
function snapEndpoints(inp,tol){ const eps=[]; inp.creases.forEach((c,ci)=>{ eps.push({ci,k:0,p:c.points[0].anchor}); eps.push({ci,k:c.points.length-1,p:c.points[c.points.length-1].anchor}); });
  const cl=[]; for(const e of eps){ let f=cl.find(g=>g.some(o=>Math.hypot(o.p.x-e.p.x,o.p.y-e.p.y)<=tol)); if(f) f.push(e); else cl.push([e]); }
  const out=JSON.parse(JSON.stringify(inp)); let moved=0,maxMove=0;
  for(const g of cl){ if(g.length<2) continue; const cx=g.reduce((s,o)=>s+o.p.x,0)/g.length, cy=g.reduce((s,o)=>s+o.p.y,0)/g.length;
    for(const o of g){ const pt=out.creases[o.ci].points[o.k]; const d=Math.hypot(pt.anchor.x-cx,pt.anchor.y-cy); maxMove=Math.max(maxMove,d); moved++; for(const h of ['anchor','left','right']){ pt[h].x=cx; pt[h].y=cy; } } }
  return {out,moved,maxMove}; }
const s=snapEndpoints(input,0.5);
console.log('fusión de extremos: puntos movidos',s.moved,'| desplazamiento máx',s.maxMove.toFixed(3),'mm');
try{ const t=core.buildFoldTopology(s.out); console.log('core con fusión: OK paneles',t.panels.length,'adyacencias',t.creaseAdjacency.length,'dif. área',t.geometryArea.difference.toExponential(2)); }catch(e){ console.log('core con fusión: FALLA ->',e.message.slice(0,140)); }
// Plugin sobre la misma geometría real de Illustrator
const lines=fs.readFileSync(PLUGIN,'utf8').split('\n'); const sl=(a,b)=>lines.slice(a-1,b).join('\n');
const src='var GRAPH_EPS=0.5; var L=[]; function log(m){L.push(m)}\n'+[sl(550,556),sl(648,776),sl(977,1194),sl(1316,1348)].join('\n')+'\nthis.buildPanels=buildPanels; this.L=L;';
const sb={}; vm.createContext(sb); vm.runInContext('(function(){'+src+'}).call(this)',sb);
const pd=sb.buildPanels({outerBoundary:input.outerBoundary,holes:input.holes||[],cutLines:[],creases:input.creases});
const tot=pd.panels.reduce((a,p)=>a+Math.abs(p.area),0);
console.log('plugin (buildPanels) sobre el export real de Illustrator: paneles',pd.panels.length,'| área total',tot.toFixed(1),'mm²');
console.log(sb.L.filter(l=>/Connectivity|Panels after|Faces traced/.test(l)).join('\n'));
