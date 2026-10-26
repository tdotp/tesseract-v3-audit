// Paneles del motor vigente (A6.4): contornos y shells/huecos por paridad, caras de la topología, filtros (área, delgadez, duplicados) y filtro de conectividad; texto idéntico al de panel/main.js. KI-04…07, KI-09 y KI-19 preservados.
import { buildAdjacencyStrict } from './adjacency.js';
import { polygonSignedArea, polygonCentroid, pointInPolygonInclusive, faceBounds } from './geom2d.js';
import { log } from './log.js';
import { buildTopology } from './topology.js';

export function contourContainsContour(outer, inner){
  if(!outer || !inner || !outer.points || !inner.points) return false;
  for(var i=0;i<inner.points.length;i++){
    if(!pointInPolygonInclusive(inner.points[i], outer.points)) return false;
  }
  return true;
}

export function classifyClosedCutContours(data){
  var contours=[];
  function addContour(pathObj, sourceName){
    if(!pathObj || !pathObj.points || pathObj.points.length < 3) return;
    var pts = pathObj.points.map(function(p){ return {x:p.anchor.x, y:p.anchor.y}; });
    contours.push({source:sourceName, points:pts, area:polygonSignedArea(pts)});
  }
  addContour(data.outerBoundary, 'outerBoundary');
  (data.holes||[]).forEach(function(h, i){ addContour(h, 'closedCut_'+i); });

  contours.forEach(function(c, idx){
    c.idx = idx;
    c.absArea = Math.abs(c.area);
    c.centroid = polygonCentroid(c.points);
    c.parentCount = 0;
  });

  contours.forEach(function(c, idx){
    contours.forEach(function(other, jdx){
      if(idx===jdx) return;
      if(other.absArea <= c.absArea) return;
      if(contourContainsContour(other, c)) c.parentCount += 1;
    });
  });

  var shells = contours.filter(function(c){ return c.parentCount % 2 === 0; });
  var holes = contours.filter(function(c){ return c.parentCount % 2 === 1; });
  log('Closed cut contours reclassified · shells='+shells.length+' holes='+holes.length+' total='+contours.length);
  return {all:contours, shells:shells, holes:holes};
}

export function buildPanels(data){
  log('=== buildPanels ===');
  var contourInfo = classifyClosedCutContours(data);

  /* Convert CLOSED cut contours + creases into topology segments.
     Open cut lines stay as visual overlays for now so they do not become fake panels. */
  var topoSegs=[];
  function addPath(pathObj,closed,type){
    if(!pathObj||!pathObj.points||pathObj.points.length<2) return;
    var pts=pathObj.points.map(function(p){return p.anchor;});
    for(var i=0;i<pts.length-1;i++){
      topoSegs.push({p1:{x:pts[i].x,y:pts[i].y},p2:{x:pts[i+1].x,y:pts[i+1].y},type:type});
    }
    if(closed) topoSegs.push({p1:{x:pts[pts.length-1].x,y:pts[pts.length-1].y},p2:{x:pts[0].x,y:pts[0].y},type:type});
  }

  contourInfo.all.forEach(function(c){
    addPath({points:c.points.map(function(pt){ return {anchor:pt}; })}, true, 'boundary');
  });
  (data.creases||[]).forEach(function(cr){ addPath(cr,false,'crease'); });

  log('Total topo segments (closed cuts + creases): '+topoSegs.length);

  var topo=buildTopology(topoSegs);
  var faces=topo.faces;
  var seenKeys={};
  var panels=[];

  faces.forEach(function(f){
    if(Math.abs(f.area) <= 1) return;
    var verts = f.vertices.slice();
    var signedArea = polygonSignedArea(verts);
    if(signedArea < 0) verts.reverse();
    var centroid = polygonCentroid(verts);
    var insideShell = contourInfo.shells.some(function(shell){ return pointInPolygonInclusive(centroid, shell.points); });
    var insideHole = contourInfo.holes.some(function(hole){ return pointInPolygonInclusive(centroid, hole.points); });
    if(!insideShell || insideHole) return;
    var b = faceBounds(verts);
    var minDim = Math.max(0.0001, Math.min(b.w, b.h));
    var maxDim = Math.max(b.w, b.h);
    var aspect = maxDim / minDim;
    var absArea = Math.abs(signedArea);
    if(absArea < 4) return;
    if(aspect > 30 && absArea < 120) return;
    var ckey = centroid.x.toFixed(2)+'|'+centroid.y.toFixed(2)+'|'+absArea.toFixed(2);
    if(seenKeys[ckey]) return;
    seenKeys[ckey] = true;
    panels.push({
      vertices: verts,
      edges: f.edges,
      area: absArea,
      centroid: centroid
    });
  });

  log('Panels after shell filter: '+panels.length);

  /* Find creases that are shared edges between panels */
  var creaseEdges=[];
  (data.creases||[]).forEach(function(cr,ci){
    if(!cr || !cr.points || cr.points.length < 2) return;
    var pts=cr.points.map(function(p){return p.anchor;});
    for(var i=0;i<pts.length-1;i++){
      creaseEdges.push({a:pts[i],b:pts[i+1],creaseIdx:ci,segIdx:i});
    }
  });

  /* Connectivity filter:
     keep the largest crease-connected component and drop isolated false islands. */
  if(panels.length > 1 && creaseEdges.length > 0){
    var adjEdges = buildAdjacencyStrict(panels, creaseEdges);
    var graph = [];
    var creaseTouch = [];
    for(var gi=0; gi<panels.length; gi++){
      graph[gi] = [];
      creaseTouch[gi] = 0;
    }
    adjEdges.forEach(function(ae){
      graph[ae.panelA].push(ae.panelB);
      graph[ae.panelB].push(ae.panelA);
      creaseTouch[ae.panelA] += 1;
      creaseTouch[ae.panelB] += 1;
    });

    var visited = {};
    var comps = [];
    for(var pi=0; pi<panels.length; pi++){
      if(visited[pi] || creaseTouch[pi] === 0) continue;
      var q = [pi];
      visited[pi] = true;
      var nodes = [];
      var areaSum = 0;
      while(q.length){
        var cur = q.shift();
        nodes.push(cur);
        areaSum += Math.abs(panels[cur].area || 0);
        for(var ni=0; ni<graph[cur].length; ni++){
          var nxt = graph[cur][ni];
          if(visited[nxt]) continue;
          visited[nxt] = true;
          q.push(nxt);
        }
      }
      comps.push({nodes:nodes, areaSum:areaSum});
    }

    if(comps.length > 0){
      comps.sort(function(a,b){
        if(Math.abs(b.areaSum - a.areaSum) > 0.001) return b.areaSum - a.areaSum;
        return b.nodes.length - a.nodes.length;
      });
      var keepMap = {};
      comps[0].nodes.forEach(function(idx){ keepMap[idx] = true; });
      var kept = [];
      panels.forEach(function(panel, idx){ if(keepMap[idx]) kept.push(panel); });
      log('Connectivity filter: keeping '+kept.length+' of '+panels.length+' panels from largest crease-connected component');
      panels = kept;
    } else {
      log('Connectivity filter: no crease-connected components found, keeping shell-filtered panels');
    }
  }

  return {panels:panels, creaseEdges:creaseEdges, creases:data.creases||[]};
}
