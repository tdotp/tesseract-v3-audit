// Topología de grafo plano del motor vigente (A6.2): división de segmentos, grafo y recorrido de caras; texto idéntico al de panel/main.js. Coste ≈ n^2.5 (KI-08) preservado.
import { ptEq, segSegIntersect, pointOnSeg } from './geom2d.js';
import { log } from './log.js';

export function buildTopology(segments){
  log('buildTopology: '+segments.length+' input segments');
  /* Split segments at intersections */
  var dirty=true, iter=0, maxIter=segments.length*segments.length+500;
  while(dirty && iter<maxIter){
    dirty=false; iter++;
    for(var i=0;i<segments.length&&!dirty;i++){
      for(var j=i+1;j<segments.length&&!dirty;j++){
        var s1=segments[i], s2=segments[j];
        var inter=segSegIntersect(s1.p1,s1.p2,s2.p1,s2.p2);
        if(inter){
          segments.splice(j,1); segments.splice(i,1);
          segments.push({p1:s1.p1,p2:inter,type:s1.type},{p1:inter,p2:s1.p2,type:s1.type},
                        {p1:s2.p1,p2:inter,type:s2.type},{p1:inter,p2:s2.p2,type:s2.type});
          dirty=true;
        }
        if(!dirty && pointOnSeg(s2.p1,s1.p1,s1.p2)){
          segments.splice(i,1);
          segments.push({p1:s1.p1,p2:s2.p1,type:s1.type},{p1:s2.p1,p2:s1.p2,type:s1.type});
          dirty=true;
        }
        if(!dirty && pointOnSeg(s2.p2,s1.p1,s1.p2)){
          segments.splice(i,1);
          segments.push({p1:s1.p1,p2:s2.p2,type:s1.type},{p1:s2.p2,p2:s1.p2,type:s1.type});
          dirty=true;
        }
        if(!dirty && pointOnSeg(s1.p1,s2.p1,s2.p2)){
          segments.splice(j,1);
          segments.push({p1:s2.p1,p2:s1.p1,type:s2.type},{p1:s1.p1,p2:s2.p2,type:s2.type});
          dirty=true;
        }
        if(!dirty && pointOnSeg(s1.p2,s2.p1,s2.p2)){
          segments.splice(j,1);
          segments.push({p1:s2.p1,p2:s1.p2,type:s2.type},{p1:s1.p2,p2:s2.p2,type:s2.type});
          dirty=true;
        }
      }
    }
  }
  log('After splitting: '+segments.length+' segments ('+iter+' iterations)');

  /* Build adjacency graph */
  var verts=[];
  function getVid(p){
    for(var i=0;i<verts.length;i++){ if(ptEq(verts[i],p)) return i; }
    verts.push({x:p.x,y:p.y}); return verts.length-1;
  }

  var adj={};
  segments.forEach(function(seg){
    if(ptEq(seg.p1,seg.p2)) return;
    var u=getVid(seg.p1), v=getVid(seg.p2);
    if(u===v) return;
    if(!adj[u]) adj[u]=[];
    if(!adj[v]) adj[v]=[];
    var angUV=Math.atan2(verts[v].y-verts[u].y, verts[v].x-verts[u].x);
    var angVU=Math.atan2(verts[u].y-verts[v].y, verts[u].x-verts[v].x);
    if(!adj[u].find(function(e){return e.to===v;}))
      adj[u].push({to:v, type:seg.type, angle:angUV, visited:false});
    if(!adj[v].find(function(e){return e.to===u;}))
      adj[v].push({to:u, type:seg.type, angle:angVU, visited:false});
  });

  Object.keys(adj).forEach(function(k){
    adj[k].sort(function(a,b){return a.angle-b.angle;});
  });

  log('Graph: '+verts.length+' vertices, '+Object.keys(adj).length+' adj entries');

  /* Trace minimal faces using planar face traversal */
  var faces=[];
  Object.keys(adj).forEach(function(uStr){
    var u=parseInt(uStr);
    adj[u].forEach(function(startEdge){
      if(startEdge.visited) return;
      var path=[], curr=startEdge, currU=u, cycleFound=false;
      var safety=0, maxSafety=verts.length*4+100;
      while(!curr.visited && safety<maxSafety){
        safety++; curr.visited=true;
        path.push({u:currU, v:curr.to, type:curr.type});
        var vId=curr.to, outgoing=adj[vId];
        if(!outgoing||outgoing.length===0) break;
        var backIdx=-1;
        for(var bi=0;bi<outgoing.length;bi++){ if(outgoing[bi].to===currU){backIdx=bi;break;} }
        if(backIdx===-1) break;
        var nextIdx=(backIdx-1+outgoing.length)%outgoing.length;
        currU=vId; curr=outgoing[nextIdx];
        if(currU===u && curr===startEdge){ cycleFound=true; break; }
      }
      if(cycleFound && path.length>=3){
        var area=0, polyPts=path.map(function(e){return verts[e.u];});
        for(var i=0;i<polyPts.length;i++){
          var p1=polyPts[i], p2=polyPts[(i+1)%polyPts.length];
          area+=(p1.x*p2.y - p2.x*p1.y);
        }
        area/=2;
        var hasCrease=path.some(function(e){return e.type==='crease';});
        faces.push({
          vertices: polyPts.map(function(v){return{x:v.x,y:v.y};}),
          edges: path.map(function(e){ return {u:{x:verts[e.u].x,y:verts[e.u].y}, v:{x:verts[e.v].x,y:verts[e.v].y}, type:e.type}; }),
          area: area, isHole: area<0, hasCreaseEdge: hasCrease
        });
      }
    });
  });

  log('Faces traced: '+faces.length);
  faces.forEach(function(f,i){ log('  Face '+i+': area='+f.area.toFixed(1)+' verts='+f.vertices.length+' hole='+f.isHole); });
  return {faces:faces, verts:verts, adj:adj};
}
