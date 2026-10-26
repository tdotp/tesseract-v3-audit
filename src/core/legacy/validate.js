// Validación previa del troquel del motor vigente (A6.5, D-A6-3): segmentos del troquel (texto idéntico al de panel/main.js) y cálculo puro de los extremos de crease sin conectar.
import { TOLERANCE_MM } from './constants.js';
import { distPtSeg } from './geom2d.js';

export function segsFromPath(pathObj,closed,type,meta){
  var s=[];
  if(!pathObj||!pathObj.points||pathObj.points.length<2) return s;
  var pts=pathObj.points.map(function(p){return p.anchor;});
  for(var i=0;i<pts.length-1;i++) s.push({a:pts[i],b:pts[i+1],type:type,meta:meta});
  if(closed) s.push({a:pts[pts.length-1],b:pts[0],type:type,meta:meta});
  return s;
}

export function buildAllSegs(data){
  var s=[];
  s.push.apply(s, segsFromPath(data.outerBoundary,true,'outer',null));
  (data.holes||[]).forEach(function(h,i){ s.push.apply(s, segsFromPath(h,true,'hole',{i:i})); });
  (data.cutLines||[]).forEach(function(cl,i){ s.push.apply(s, segsFromPath(cl.geom,false,'cutLine',{i:i})); });
  (data.creases||[]).forEach(function(cr,i){ s.push.apply(s, segsFromPath(cr,false,'crease',{i:i})); });
  return s;
}

/* Cálculo de la validación previa (A6.5, D-A6-3): el MISMO texto que calculaba validateGeometry (desde «var allS» hasta el forEach),
   ahora sin DOM. Devuelve {problems}; mismo orden, mismos id P1, P2…, misma distancia redondeada y el punto ES el anchor de la entrada. */
export function validateDieline(data){
  var problems=[];
  if(!data||data.error) return {problems:problems};
  var allS=buildAllSegs(data);
  (data.creases||[]).forEach(function(cr,ci){
    if(!cr.points||cr.points.length<2) return;
    [cr.points[0].anchor, cr.points[cr.points.length-1].anchor].forEach(function(ep){
      var best=Infinity;
      for(var i=0;i<allS.length;i++){
        var sg=allS[i]; if(sg.type==='crease'&&sg.meta&&sg.meta.i===ci) continue;
        var d=distPtSeg(ep,sg.a,sg.b); if(d<best) best=d;
      }
      if(best>TOLERANCE_MM) problems.push({id:'P'+(problems.length+1),type:'Crease endpoint unconnected',dist:Number(best.toFixed(2)),point:ep});
    });
  });
  return {problems:problems};
}
