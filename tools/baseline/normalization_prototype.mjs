// PROTOTIPO DE ANÁLISIS — NO ES UNA SOLUCIÓN. Evidencia para la decisión D4.
// Normalización ingenua de creases (recorte de excesos + cluster de extremos + snap al contorno/otras creases), independiente del motor.
// Resultado (ver docs/fase0/08): NO arregla el core con el export real de Illustrator y ROMPE el core con el fixture JSON
// (quedan astillas fuera del contorno junto a la crease 7 por la forma del contorno), y no cambia el 11/13 del motor legacy.
// Con clasificación ESTRICTA de caras (centroide sin tolerancia) la suma interior sí iguala el área del contorno.
// Uso: PLUGIN_MAIN=... WEB_DIR=... [EPS=0.5] node normalization_prototype.mjs
import fs from 'node:fs'; import vm from 'node:vm';
const WEB=process.env.WEB_DIR, PLUGIN=process.env.PLUGIN_MAIN, EPS=+(process.env.EPS||0.5);
const core=await import(WEB+'/packages/core/dist/index.js');
const L=fs.readFileSync(PLUGIN,'utf8').split('\n'),sl=(a,b)=>L.slice(a-1,b).join('\n');
const sb={};vm.createContext(sb);vm.runInContext('(function(){var GRAPH_EPS=0.5;function log(){}\n'+[sl(550,556),sl(648,776),sl(977,1194),sl(1316,1348)].join('\n')+'\nthis.buildPanels=buildPanels;}).call(this)',sb);

const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function projSeg(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;let t=l2?((p.x-a.x)*dx+(p.y-a.y)*dy)/l2:0;t=Math.max(0,Math.min(1,t));return {x:a.x+t*dx,y:a.y+t*dy,t}}
function segInter(a,b,c,e){const r={x:b.x-a.x,y:b.y-a.y},s={x:e.x-c.x,y:e.y-c.y},den=r.x*s.y-r.y*s.x;if(Math.abs(den)<1e-12)return null;const t=((c.x-a.x)*s.y-(c.y-a.y)*s.x)/den,u=((c.x-a.x)*r.y-(c.y-a.y)*r.x)/den;return (t>=0&&t<=1&&u>=0&&u<=1)?{t,x:a.x+t*r.x,y:a.y+t*r.y}:null}

function normalize(input,eps){
  const outer=core.flattenPath(input.outerBoundary); const rep=[]; const N=outer.length;
  const edges=outer.map((p,i)=>[p,outer[(i+1)%N]]);
  const nearOuter=p=>{let best=null,bd=1e9;for(const [a,b] of edges){const q=projSeg(p,a,b);const dd=d(p,q);if(dd<bd){bd=dd;best=q}}return {q:best,d:bd}};
  // 1) polilíneas planas
  let C=input.creases.map((c,i)=>({id:i,pts:core.flattenPath(c).map(p=>({x:p.x,y:p.y}))}));
  // 2) recorte de excesos: parte fuera del contorno (prueba estricta) se corta en el último cruce
  for(const c of C){ const out=[]; for(let i=0;i<c.pts.length-1;i++){let a=c.pts[i],b=c.pts[i+1];
      const ia=core.pointInPoly(a,outer)||nearOuter(a).d<1e-9, ib=core.pointInPoly(b,outer)||nearOuter(b).d<1e-9;
      if(ia&&ib){out.push([a,b]);continue}
      const xs=[];for(const [e1,e2] of edges){const x=segInter(a,b,e1,e2);if(x)xs.push(x)}
      if(!ia&&!ib){ if(xs.length>=2){xs.sort((p,q)=>p.t-q.t);out.push([xs[0],xs[xs.length-1]])} else rep.push({tipo:'crease fuera del contorno descartada',id:c.id}); continue}
      if(!xs.length){ // sobresale sin cruzar (dentro de tolerancia): se proyecta al contorno más cercano
        const o=nearOuter(ia?b:a); if(o.d<=eps){rep.push({tipo:'extremo fuera proyectado al contorno',id:c.id,dist:+o.d.toFixed(4)});out.push(ia?[a,o.q]:[o.q,b])} continue}
      xs.sort((p,q)=>p.t-q.t); const x=ia?xs[0]:xs[xs.length-1]; // cruce más cercano al lado interior
      const cut=ia?[a,x]:[x,b]; const lost=ia?d(x,b):d(a,x); rep.push({tipo:'exceso recortado',id:c.id,mm:+lost.toFixed(4)}); out.push(cut)}
    // reensamblar polilínea
    if(out.length){const poly=[out[0][0]];for(const [a,b] of out){if(d(poly[poly.length-1],a)>1e-9)poly.push(a);poly.push(b)}c.pts=poly}else c.pts=[] }
  C=C.filter(c=>c.pts.length>=2);
  // 3) extremos: cluster crease↔crease, luego contorno, luego T con otra crease
  const eps_=[];C.forEach(c=>{eps_.push({c,k:0});eps_.push({c,k:c.pts.length-1})});
  const cl=[];for(const e of eps_){const p=e.c.pts[e.k];const f=cl.find(g=>g.some(o=>d(o.c.pts[o.k],p)<=eps));f?f.push(e):cl.push([e])}
  for(const g of cl){let t={x:g.reduce((s,o)=>s+o.c.pts[o.k].x,0)/g.length,y:g.reduce((s,o)=>s+o.c.pts[o.k].y,0)/g.length},tipo='cluster';
    const no=nearOuter(t); if(no.d<=eps){t=no.q;tipo='cluster→contorno'}
    else{ let best=null,bd=eps; for(const c of C){for(let i=0;i<c.pts.length-1;i++){ if(g.some(o=>o.c===c&&(o.k===i||o.k===i+1))) continue; const q=projSeg(t,c.pts[i],c.pts[i+1]); if(d(t,q)<=bd){bd=d(t,q);best=q}}} if(best){t=best;tipo='cluster→T con otra crease'} }
    for(const o of g){const p=o.c.pts[o.k];const mv=d(p,t);if(mv>1e-9){rep.push({tipo,id:o.c.id,dist:+mv.toFixed(4)});p.x=t.x;p.y=t.y}} }
  const out={...input,creases:C.map(c=>({closed:false,points:c.pts.map(p=>({anchor:{...p},left:{...p},right:{...p}}))}))};
  return {out,rep};
}
const sig=i=>JSON.stringify(i.creases.map(c=>c.points.map(p=>[+p.anchor.x.toFixed(9),+p.anchor.y.toFixed(9)])));
function runEngines(label,inp){
  const r={label};
  try{const t=core.buildFoldTopology(inp);r.core=`OK ${t.panels.length} paneles, ${t.creaseAdjacency.length} adyacencias, ΔA ${t.geometryArea.difference.toExponential(1)}`}catch(e){r.core='FALLA: '+e.message.slice(0,300)}
  try{const p=sb.buildPanels({outerBoundary:inp.outerBoundary,holes:inp.holes||[],cutLines:[],creases:inp.creases});r.legacy=`${p.panels.length} paneles, área ${p.panels.reduce((s,q)=>s+Math.abs(q.area),0).toFixed(1)}`}catch(e){r.legacy='FALLA '+e.message}
  return r}
const cases={
 'export real de Illustrator (SVG)':core.parseDieline(fs.readFileSync(WEB+'/packages/core/src/__tests__/fixtures/caja-botanica-illustrator-export.svg','utf8')),
 'fixture JSON del plugin':JSON.parse(fs.readFileSync(WEB+'/packages/core/src/__tests__/fixtures/caja-botanica-real.json','utf8')),
};
for(const [name,inp] of Object.entries(cases)){
  console.log('\n== '+name+' (ε='+EPS+' mm)');
  console.log(' antes   :',JSON.stringify(runEngines('antes',inp)));
  const {out,rep}=normalize(inp,EPS); const again=normalize(out,EPS);
  const counts={};rep.forEach(r=>counts[r.tipo]=(counts[r.tipo]||0)+1);
  const maxd=Math.max(0,...rep.map(r=>r.dist||r.mm||0));
  console.log(' ajustes :',JSON.stringify(counts),'| máx',maxd,'mm');
  console.log(' contorno intacto:',JSON.stringify(inp.outerBoundary)===JSON.stringify(out.outerBoundary));
  console.log(' idempotente (2ª pasada sin ajustes):',again.rep.length===0,again.rep.length?JSON.stringify(again.rep.slice(0,3)):'');
  console.log(' después :',JSON.stringify(runEngines('después',out)));
}

// ---- diagnóstico: caras pequeñas tras normalizar (fixture JSON)
{
  const inp=cases['fixture JSON del plugin']; const {out}=normalize(inp,EPS); const outer=core.flattenPath(out.outerBoundary);
  const bseg=outer.map((p,i)=>({start:p,end:outer[(i+1)%outer.length],type:'boundary'}));
  const segs=[...bseg]; out.creases.forEach((c,i)=>{const pl=c.points.map(p=>p.anchor);for(let k=0;k<pl.length-1;k++)segs.push({start:pl[k],end:pl[k+1],type:'crease',creaseId:String(i)})});
  const g=core.buildPlanarGraph(segs);
  const cen=v=>{let a=0,cx=0,cy=0;for(let i=0;i<v.length;i++){const p=v[i],q=v[(i+1)%v.length],cr=p.x*q.y-q.x*p.y;a+=cr;cx+=(p.x+q.x)*cr;cy+=(p.y+q.y)*cr}a/=2;return {x:cx/(6*a),y:cy/(6*a)}};
  const small=g.faces.filter(f=>f.area>1e-9&&f.area<5);
  console.log('\nDIAG caras pequeñas (<5 mm²):',small.map(f=>({a:+f.area.toFixed(5),n:f.vertices.length,estrictoDentro:core.pointInPoly(cen(f.vertices),outer),c:(c=>`${c.x.toFixed(2)},${c.y.toFixed(2)}`)(cen(f.vertices))})));
  const pos=g.faces.filter(f=>f.area>1e-7);console.log('suma caras + =',pos.reduce((s,f)=>s+f.area,0).toFixed(6),' contorno=',Math.abs(core.polyArea(outer)).toFixed(6),'caras+:',pos.length);
}
