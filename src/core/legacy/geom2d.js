// Geometría 2D auxiliar del motor vigente (A6.2): texto idéntico al de panel/main.js (referencia A1); tolerancias absolutas preservadas (KI-18, KI-22).
import { GRAPH_EPS } from './constants.js';

export function distPtSeg(p,a,b){
  var l2=(b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y);
  if(l2===0) return Math.hypot(p.x-a.x,p.y-a.y);
  var t=((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2;
  t=Math.max(0,Math.min(1,t));
  return Math.hypot(p.x-(a.x+t*(b.x-a.x)), p.y-(a.y+t*(b.y-a.y)));
}

export function dist2d(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

export function ptEq(a,b){ return dist2d(a,b) < GRAPH_EPS; }

export function segSegIntersect(a1,a2,b1,b2){
  var det=(a2.x-a1.x)*(b2.y-b1.y)-(b2.x-b1.x)*(a2.y-a1.y);
  if(Math.abs(det)<1e-9) return null;
  var lam=((b2.y-b1.y)*(b2.x-a1.x)+(b1.x-b2.x)*(b2.y-a1.y))/det;
  var gam=((a1.y-a2.y)*(b2.x-a1.x)+(a2.x-a1.x)*(b2.y-a1.y))/det;
  if(lam>1e-6 && lam<1-1e-6 && gam>1e-6 && gam<1-1e-6){
    return {x:a1.x+lam*(a2.x-a1.x), y:a1.y+lam*(a2.y-a1.y)};
  }
  return null;
}

export function pointOnSeg(pt,a,b){
  var d1=dist2d(pt,a), d2=dist2d(pt,b), len=dist2d(a,b);
  return d1>GRAPH_EPS && d2>GRAPH_EPS && Math.abs(d1+d2-len)<GRAPH_EPS;
}

export function polygonSignedArea(verts){
  var area=0;
  for(var i=0;i<verts.length;i++){
    var a=verts[i], b=verts[(i+1)%verts.length];
    area += a.x*b.y - b.x*a.y;
  }
  return area/2;
}

export function polygonCentroid(verts){
  var a = polygonSignedArea(verts);
  if(Math.abs(a) < 1e-9){
    var cx=0, cy=0;
    verts.forEach(function(v){ cx+=v.x; cy+=v.y; });
    return {x:cx/verts.length, y:cy/verts.length};
  }
  var cx2=0, cy2=0;
  for(var i=0;i<verts.length;i++){
    var p=verts[i], q=verts[(i+1)%verts.length];
    var cross = p.x*q.y - q.x*p.y;
    cx2 += (p.x + q.x) * cross;
    cy2 += (p.y + q.y) * cross;
  }
  return {x:cx2/(6*a), y:cy2/(6*a)};
}

export function pointOnSegment2D(pt,a,b){
  return distPtSeg(pt,a,b) <= GRAPH_EPS;
}

export function pointInPolygonInclusive(pt, verts){
  if(!verts || verts.length < 3) return false;
  for(var i=0;i<verts.length;i++){
    if(pointOnSegment2D(pt, verts[i], verts[(i+1)%verts.length])) return true;
  }
  var inside=false;
  for(var j=0,k=verts.length-1;j<verts.length;k=j++){
    var xi=verts[j].x, yi=verts[j].y;
    var xk=verts[k].x, yk=verts[k].y;
    var intersect=((yi>pt.y)!=(yk>pt.y)) &&
      (pt.x < (xk-xi)*(pt.y-yi)/((yk-yi)||1e-9) + xi);
    if(intersect) inside=!inside;
  }
  return inside;
}

export function faceBounds(verts){
  var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  verts.forEach(function(v){
    minX=Math.min(minX,v.x); minY=Math.min(minY,v.y);
    maxX=Math.max(maxX,v.x); maxY=Math.max(maxY,v.y);
  });
  return {minX:minX,minY:minY,maxX:maxX,maxY:maxY,w:maxX-minX,h:maxY-minY};
}

export function getPolyCentroid(verts){
  var cx=0,cy=0;
  verts.forEach(function(v){cx+=v.x;cy+=v.y;});
  return {x:cx/verts.length, y:cy/verts.length};
}

export function edgeMatch(a1,a2,b1,b2){
  var eps=GRAPH_EPS;
  return (dist2d(a1,b1)<eps&&dist2d(a2,b2)<eps)||(dist2d(a1,b2)<eps&&dist2d(a2,b1)<eps);
}
