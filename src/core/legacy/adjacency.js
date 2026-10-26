// Adyacencia por creases del motor vigente (A6.3): estricta (filtro de conectividad de buildPanels) y robusta con dos respaldos (plegado); texto idéntico al de panel/main.js. KI-04 preservado.
import { GRAPH_EPS } from './constants.js';
import { edgeMatch } from './geom2d.js';
import { log } from './log.js';

export function buildAdjacencyStrict(panels,creaseEdges){
  /* Strict adjacency used only for topology cleanup.
     This avoids over-connecting tiny false panels during connectivity filtering. */
  var adj=[];
  if(!creaseEdges || !creaseEdges.length) return adj;
  creaseEdges.forEach(function(ce){
    var sharing=[];
    panels.forEach(function(panel,pi){
      var verts=panel.vertices;
      for(var i=0;i<verts.length;i++){
        var j=(i+1)%verts.length;
        if(edgeMatch(verts[i],verts[j],ce.a,ce.b)){
          sharing.push(pi); break;
        }
      }
    });
    if(sharing.length===2){
      adj.push({panelA:sharing[0],panelB:sharing[1],crease:ce,creaseIdx:ce.creaseIdx});
    }
  });
  return adj;
}

export function buildAdjacency(panels,creaseEdges){
  /* Robust adjacency for folding UI.
     Strategy:
     1) try strict raw crease matches;
     2) try raw creases against panel crease edges with overlap;
     3) final fallback: derive fold adjacencies directly from shared panel crease edges.
     This avoids losing folds when topology split the crease into smaller sub-segments. */
  var strictAdj = buildAdjacencyStrict(panels, creaseEdges);
  if(strictAdj.length){
    log('Adjacency edges: '+strictAdj.length+' (strict)');
    return strictAdj;
  }

  var adj=[];
  var seen={};
  var eps = Math.max(GRAPH_EPS, 1.0);

  if(!creaseEdges || !creaseEdges.length){
    log('Adjacency edges: 0 (no explicit crease segments available)');
    return adj;
  }

  function edgeKey(a,b){
    var p1={x:a.x,y:a.y}, p2={x:b.x,y:b.y};
    var swap = (p1.x>p2.x) || (Math.abs(p1.x-p2.x)<eps && p1.y>p2.y);
    if(swap){ var t=p1; p1=p2; p2=t; }
    return p1.x.toFixed(2)+'|'+p1.y.toFixed(2)+'|'+p2.x.toFixed(2)+'|'+p2.y.toFixed(2);
  }

  function lineOverlapSegment(a1,a2,b1,b2){
    var va={x:a2.x-a1.x,y:a2.y-a1.y};
    var la=Math.hypot(va.x,va.y);
    if(la<eps) return null;
    var cross1=Math.abs(va.x*(b1.y-a1.y)-va.y*(b1.x-a1.x));
    var cross2=Math.abs(va.x*(b2.y-a1.y)-va.y*(b2.x-a1.x));
    if((cross1/la)>eps || (cross2/la)>eps) return null;
    var axis = Math.abs(va.x)>=Math.abs(va.y) ? 'x' : 'y';
    var aStart=a1[axis], aEnd=a2[axis];
    var bStart=b1[axis], bEnd=b2[axis];
    var aMin=Math.min(aStart,aEnd), aMax=Math.max(aStart,aEnd);
    var bMin=Math.min(bStart,bEnd), bMax=Math.max(bStart,bEnd);
    var oMin=Math.max(aMin,bMin), oMax=Math.min(aMax,bMax);
    if((oMax-oMin) <= Math.max(eps*1.2, Math.min(Math.abs(aMax-aMin), Math.abs(bMax-bMin))*0.20)) return null;
    var useX = axis==='x';
    function pointAt(val){
      var t = useX ? ((Math.abs(a2.x-a1.x)<eps)?0:(val-a1.x)/(a2.x-a1.x)) : ((Math.abs(a2.y-a1.y)<eps)?0:(val-a1.y)/(a2.y-a1.y));
      return {x:a1.x + t*(a2.x-a1.x), y:a1.y + t*(a2.y-a1.y)};
    }
    var pStart=pointAt(oMin), pEnd=pointAt(oMax);
    return {a:pStart,b:pEnd};
  }

  function pushAdj(panelA,panelB,seg,creaseIdx,mode){
    if(panelA===panelB || !seg) return;
    var key=edgeKey(seg.a, seg.b)+'|'+Math.min(panelA,panelB)+'|'+Math.max(panelA,panelB);
    if(seen[key]) return;
    seen[key]=true;
    adj.push({
      panelA:Math.min(panelA,panelB),
      panelB:Math.max(panelA,panelB),
      crease:{a:{x:seg.a.x,y:seg.a.y}, b:{x:seg.b.x,y:seg.b.y}},
      creaseIdx:creaseIdx
    });
  }

  if(creaseEdges && creaseEdges.length){
    creaseEdges.forEach(function(ce){
      var sharing=[];
      panels.forEach(function(panel,pi){
        var pedges=(panel.edges||[]).filter(function(e){ return e.type==='crease'; });
        for(var ei=0;ei<pedges.length;ei++){
          var pe=pedges[ei];
          var overlap=lineOverlapSegment(pe.u,pe.v,ce.a,ce.b);
          if(edgeMatch(pe.u,pe.v,ce.a,ce.b) || overlap){
            sharing.push({idx:pi, edge:pe, seg: overlap || {a:pe.u,b:pe.v}});
          }
        }
      });
      if(sharing.length>=2){
        for(var si=0; si<sharing.length-1; si++){
          for(var sj=si+1; sj<sharing.length; sj++){
            var seg = lineOverlapSegment(sharing[si].edge.u, sharing[si].edge.v, sharing[sj].edge.u, sharing[sj].edge.v) || sharing[si].seg || sharing[sj].seg;
            pushAdj(sharing[si].idx, sharing[sj].idx, seg, ce.creaseIdx, 'raw-vs-panel');
          }
        }
      }
    });
  }

  if(adj.length){
    log('Adjacency edges: '+adj.length+' (raw-panel overlap)');
    return adj;
  }

  /* Final fallback: derive folds purely from shared crease edges between panels. */
  for(var i=0;i<panels.length;i++){
    var edgesA=(panels[i].edges||[]).filter(function(e){ return e.type==='crease'; });
    if(!edgesA.length) continue;
    for(var j=i+1;j<panels.length;j++){
      var edgesB=(panels[j].edges||[]).filter(function(e){ return e.type==='crease'; });
      if(!edgesB.length) continue;
      for(var ai=0; ai<edgesA.length; ai++){
        for(var bi=0; bi<edgesB.length; bi++){
          var seg=lineOverlapSegment(edgesA[ai].u, edgesA[ai].v, edgesB[bi].u, edgesB[bi].v);
          if(seg){
            pushAdj(i, j, seg, -1, 'panel-panel');
          }
        }
      }
    }
  }

  log('Adjacency edges: '+adj.length+' (panel-panel fallback)');
  return adj;
}
