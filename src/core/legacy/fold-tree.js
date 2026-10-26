// Árbol de plegado (BFS desde la base), signo de pliegue y base por defecto del motor vigente (A6.3): texto idéntico al de panel/main.js.
import { getPolyCentroid } from './geom2d.js';
import { log } from './log.js';

export function buildFoldTree(panels,adjEdges,baseIdx){
  /* BFS from base panel */
  var visited={}; visited[baseIdx]=true;
  var tree=[]; /* {parent, child, crease} */
  var queue=[baseIdx];
  while(queue.length>0){
    var curr=queue.shift();
    adjEdges.forEach(function(ae){
      var neighbor=-1;
      if(ae.panelA===curr&&!visited[ae.panelB]) neighbor=ae.panelB;
      if(ae.panelB===curr&&!visited[ae.panelA]) neighbor=ae.panelA;
      if(neighbor>=0){
        visited[neighbor]=true;
        tree.push({parent:curr,child:neighbor,crease:ae.crease, sign: computeFoldSign(panels[curr], panels[neighbor], ae.crease)});
        queue.push(neighbor);
      }
    });
  }
  log('Fold tree edges: '+tree.length+' (base=P'+baseIdx+')');
  return tree;
}

export function computeFoldSign(parentPanel, childPanel, crease){
  if(!parentPanel || !childPanel || !crease) return 1;
  var ax = crease.a.x, ay = crease.a.y, bx = crease.b.x, by = crease.b.y;
  var vx = bx - ax, vy = by - ay;
  var cc = childPanel.centroid || getPolyCentroid(childPanel.vertices || []);
  var cross = vx * (cc.y - ay) - vy * (cc.x - ax);
  if(Math.abs(cross) < 0.001){
    var pc = parentPanel.centroid || getPolyCentroid(parentPanel.vertices || []);
    cross = vx * (pc.y - ay) - vy * (pc.x - ax);
    cross *= -1;
  }
  return cross >= 0 ? 1 : -1;
}

export function getDefaultBaseIndex(panelData){
  var bestBase=0, bestArea=0;
  panelData.panels.forEach(function(p,i){
    if(Math.abs(p.area)>bestArea){bestArea=Math.abs(p.area);bestBase=i;}
  });
  return bestBase;
}
