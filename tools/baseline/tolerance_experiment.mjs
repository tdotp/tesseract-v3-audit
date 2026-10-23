// Experimento (solo lectura, no modifica el repo web): ¿por qué buildFoldTopology falla con la exportación real de
// Illustrator aun fusionando los extremos de crease a <=0.5 mm?
// Resultado: no es la fusión. Hay 6 astillas (0.024 mm² en total) FUERA del contorno, producidas por creases que
// sobresalen <0.5 mm del corte; el filtro 'inclusivo' de 0.5 mm de topology.ts las cuenta como paneles. Con una
// prueba estricta de centroide, la suma de caras interiores = área esperada (15521.328267 mm²) exactamente.
// Uso:  WEB_DIR=<copia construida de tesseract-web> node tolerance_experiment.mjs
import fs from 'node:fs';
const WEB=process.env.WEB_DIR;
const core=await import(WEB+'/packages/core/dist/index.js');
const svg=fs.readFileSync(WEB+'/packages/core/src/__tests__/fixtures/caja-botanica-illustrator-export.svg','utf8');
const input=core.parseDieline(svg);
const outer=core.flattenPath(input.outerBoundary);
function nearestOnBoundary(p){let best=null,bd=1e9;for(let i=0;i<outer.length;i++){const a=outer[i],b=outer[(i+1)%outer.length];const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;let t=l2?((p.x-a.x)*dx+(p.y-a.y)*dy)/l2:0;t=Math.max(0,Math.min(1,t));const q={x:a.x+t*dx,y:a.y+t*dy};const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<bd){bd=d;best=q}}return {q:best,d:bd}}
function cluster(inp,tol,mode){const eps=[];inp.creases.forEach((c,ci)=>{eps.push({ci,k:0,p:c.points[0].anchor});eps.push({ci,k:c.points.length-1,p:c.points[c.points.length-1].anchor})});
 const cl=[];for(const e of eps){const f=cl.find(g=>g.some(o=>Math.hypot(o.p.x-e.p.x,o.p.y-e.p.y)<=tol));if(f)f.push(e);else cl.push([e])}
 const out=JSON.parse(JSON.stringify(inp));let maxMove=0,n=0,onB=0;
 for(const g of cl){const cx=g.reduce((s,o)=>s+o.p.x,0)/g.length,cy=g.reduce((s,o)=>s+o.p.y,0)/g.length;let tgt={x:cx,y:cy};
  const nb=nearestOnBoundary(tgt); const nearB=nb.d<=0.5; if(nearB){ if(mode==='boundary'){tgt=nb.q;} onB++; }
  if(g.length<2&&!(mode==='boundary'&&nearB))continue;
  for(const o of g){const pt=out.creases[o.ci].points[o.k];maxMove=Math.max(maxMove,Math.hypot(pt.anchor.x-tgt.x,pt.anchor.y-tgt.y));n++;for(const h of['anchor','left','right']){pt[h].x=tgt.x;pt[h].y=tgt.y}}}
 return {out,maxMove,n,clusters:cl.length,onB}}
for(const [name,mode] of [['centroide','centroid'],['centroide→proyectado al contorno si está a ≤0.5 mm','boundary']]){
 const c=cluster(input,0.5,mode);
 try{const t=core.buildFoldTopology(c.out);console.log(name,'| clusters',c.clusters,'(en contorno',c.onB+')','movidos',c.n,'máx',c.maxMove.toFixed(3),'mm → OK paneles',t.panels.length,'adyacencias',t.creaseAdjacency.length,'ΔA',t.geometryArea.difference.toExponential(2))}
 catch(e){console.log(name,'| clusters',c.clusters,'movidos',c.n,'máx',c.maxMove.toFixed(3),'→ FALLA:',e.message.slice(0,150))}}

// Diagnóstico del Δ de área con la variante 'boundary'
const c=cluster(input,0.5,'boundary');
const bseg=outer.map((p,i)=>({start:p,end:outer[(i+1)%outer.length],type:'boundary'}));
const creases=c.out.creases.map(cr=>core.flattenPath(cr).map(p=>{const nb=nearestOnBoundary(p);return nb.d<=0.500001?nb.q:p}));
const segs=[...bseg];creases.forEach((pl,i)=>{for(let k=0;k<pl.length-1;k++)segs.push({start:pl[k],end:pl[k+1],type:'crease',creaseId:String(i)})});
const g=core.buildPlanarGraph(segs);
const ar=g.faces.map(f=>f.area);const pos=ar.filter(a=>a>1e-7);
console.log('caras',g.faces.length,'positivas',pos.length,'suma positivas',pos.reduce((a,b)=>a+b,0).toFixed(6),'| negativas',ar.filter(a=>a<=1e-7).map(a=>a.toFixed(3)).join(','),'| esperado',Math.abs(core.polyArea(outer)).toFixed(6));
console.log('áreas ordenadas',pos.map(a=>a.toFixed(3)).sort((a,b)=>a-b).join(' '));
const extra=g.faces.filter(f=>f.area<=1e-7);console.log('cara(s) no positiva(s): vértices',extra.map(f=>f.vertices.length));

// ¿Las astillas están fuera del contorno? (prueba estricta de punto-en-polígono, sin tolerancia)
const cen=v=>{let a=0,cx=0,cy=0;for(let i=0;i<v.length;i++){const p=v[i],q=v[(i+1)%v.length],cr=p.x*q.y-q.x*p.y;a+=cr;cx+=(p.x+q.x)*cr;cy+=(p.y+q.y)*cr}a/=2;return {x:cx/(6*a),y:cy/(6*a)}};
const inside=g.faces.filter(f=>f.area>1e-7).map(f=>({a:f.area,strictIn:core.pointInPoly(cen(f.vertices),outer)}));
const out=inside.filter(f=>!f.strictIn),inn=inside.filter(f=>f.strictIn);
console.log('caras con centroide ESTRICTAMENTE dentro:',inn.length,'suma',inn.reduce((s,f)=>s+f.a,0).toFixed(6),'| fuera:',out.length,'áreas',out.map(f=>f.a.toFixed(4)).join(','),'suma',out.reduce((s,f)=>s+f.a,0).toFixed(6),'| esperado',Math.abs(core.polyArea(outer)).toFixed(6));
