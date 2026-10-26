// A7.3 — Visor 3D: renderer, cámara, luces, rejilla, ejes, capa de órbita/pan/zoom/selección y bucle de render continuo (KI-11, sin cambios).
// Texto idéntico al de src/main.js de 2939dbc salvo la sangría y «S.». document y window solo en init3D. Las funciones de selección por clic
// (pickPanelFromEvent, pickCreaseFromEvent) son orquestadores de main.js y llegan por deps; THREE es el global de index.html.

export function createViewport(S, deps){
  var { canvas3d, viewport3d, log, setStatus, pickPanelFromEvent, pickCreaseFromEvent } = deps;

  function resize3D(){
    if(!S.renderer3d||!S.camera3d) return;
    var w=canvas3d.clientWidth||canvas3d.width;
    var h=canvas3d.clientHeight||canvas3d.height;
    var iw=Math.max(1,Math.floor(w));
    var ih=Math.max(1,Math.floor(h));
    if(canvas3d.width!==iw||canvas3d.height!==ih){
      canvas3d.width=iw; canvas3d.height=ih;
      S.renderer3d.setSize(iw,ih,false);
      S.camera3d.aspect=iw/ih;
      S.camera3d.updateProjectionMatrix();
    }
  }

  function updateCameraFromOrbit(){
    if(!S.orbitState) return;
    S.orbitState.spherical.makeSafe();
    var pos=new THREE.Vector3().setFromSpherical(S.orbitState.spherical).add(S.orbitState.target);
    S.camera3d.position.copy(pos);
    S.camera3d.lookAt(S.orbitState.target);
  }

  function init3D(){
    if(S.renderer3d) return true;
    if(!window.THREE||!THREE.WebGLRenderer){
      setStatus('Error: Three.js not loaded'); return false;
    }

    S.renderer3d=new THREE.WebGLRenderer({canvas:canvas3d,antialias:true,alpha:false,preserveDrawingBuffer:true});
    S.renderer3d.setClearColor(0xffffff,1);
    S.renderer3d.setPixelRatio(window.devicePixelRatio||1);
    log('Renderer created OK');

    S.scene3d=new THREE.Scene();
    S.camera3d=new THREE.PerspectiveCamera(45,1,0.01,100000);
    S.raycaster3d = new THREE.Raycaster();
    S.pointer3d = new THREE.Vector2();

    /* Lighting */
    S.scene3d.add(new THREE.AmbientLight(0xffffff,0.6));
    var dir=new THREE.DirectionalLight(0xffffff,0.8);
    dir.position.set(400,300,700); S.scene3d.add(dir);
    S.scene3d.add(new THREE.HemisphereLight(0xffffff,0xf3f4f6,0.65));

    /* Grid — light gray on dark bg */
    var grid=new THREE.GridHelper(1200,60,0xd1d5db,0xe5e7eb);
    grid.material.opacity=0.4; grid.material.transparent=true;
    S.scene3d.add(grid);

    /* Small axes in corner */
    var axes=new THREE.AxesHelper(80);
    axes.position.set(-550,0,-550);
    S.scene3d.add(axes);

    /* ── Transparent overlay for orbit/pan/zoom (CEP-safe) ── */
    var ov=document.createElement('div');
    ov.id='three-overlay';
    ov.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;cursor:grab;touch-action:none;';
    viewport3d.style.position='relative';
    viewport3d.appendChild(ov);

    var drag={active:false,btn:-1,x:0,y:0,moved:false};

    function onDown(e){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      drag.active=true;drag.btn=e.button;drag.x=e.clientX;drag.y=e.clientY;drag.moved=false;
      ov.style.cursor='grabbing';
      if(ov.setPointerCapture&&e.pointerId!==undefined) try{ov.setPointerCapture(e.pointerId);}catch(ex){}
    }
    function onUp(e){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      var wasActive=drag.active;
      var wasBtn=drag.btn;
      var wasMoved=drag.moved;
      drag.active=false;drag.btn=-1;ov.style.cursor='grab';
      if(ov.releasePointerCapture&&e.pointerId!==undefined) try{ov.releasePointerCapture(e.pointerId);}catch(ex){}
      if(wasActive && !wasMoved && wasBtn===0){
        try{
          if(e.shiftKey){
            if(pickPanelFromEvent(e)) return;
          } else if(e.altKey){
            if(pickCreaseFromEvent(e)) return;
          }
        }catch(ex){ log('Pick error: '+ex.message); }
      }
    }
    function onMove(e){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(!drag.active||!S.orbitState) return;
      var dx=e.clientX-drag.x, dy=e.clientY-drag.y;
      if(Math.abs(dx)>5||Math.abs(dy)>5) drag.moved=true;
      drag.x=e.clientX; drag.y=e.clientY;
      if(drag.btn===2||(drag.btn===0&&e.shiftKey)){
        /* Pan */
        var te=S.camera3d.matrix.elements;
        var right=new THREE.Vector3(te[0],te[1],te[2]).normalize();
        var up=new THREE.Vector3(te[4],te[5],te[6]).normalize();
        var pan=right.multiplyScalar(-dx*S.orbitState.panSpeed).add(up.multiplyScalar(dy*S.orbitState.panSpeed));
        S.orbitState.target.add(pan);
      } else if(drag.btn===0){
        /* Orbit */
        S.orbitState.spherical.theta-=dx*S.orbitState.rotateSpeed;
        S.orbitState.spherical.phi-=dy*S.orbitState.rotateSpeed;
      }
      updateCameraFromOrbit();
    }
    function onWheel(e){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(!S.orbitState) return;
      var delta=(e.deltaY>0)?1.08:0.92;
      S.orbitState.spherical.radius*=delta;
      S.orbitState.spherical.radius=Math.max(20,Math.min(S.orbitState.spherical.radius,50000));
      updateCameraFromOrbit();
    }

    /* Bind both pointer and mouse events for max CEP compatibility */
    ov.addEventListener('pointerdown',onDown,{capture:true,passive:false});
    ov.addEventListener('pointermove',onMove,{capture:true,passive:false});
    ov.addEventListener('pointerup',onUp,{capture:true,passive:false});
    ov.addEventListener('mousedown',onDown,{capture:true,passive:false});
    ov.addEventListener('mousemove',onMove,{capture:true,passive:false});
    ov.addEventListener('mouseup',onUp,{capture:true,passive:false});
    ov.addEventListener('wheel',onWheel,{capture:true,passive:false});
    ov.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();},{capture:true});

    viewport3d._overlay=ov;
    log('Overlay controls attached');

    /* Render loop */
    var firstFrame=false;
    function loop(){
      requestAnimationFrame(loop);
      resize3D();
      if(S.orbitState) S.camera3d.lookAt(S.orbitState.target);
      S.renderer3d.render(S.scene3d,S.camera3d);
      if(!firstFrame){firstFrame=true;log('First frame rendered');}
    }
    loop();
    window.addEventListener('resize',resize3D);
    resize3D();
    return true;
  }

  function fitCamera3D(){
    if(S.panelMeshes.length===0) return;
    if(S.scene3d) S.scene3d.updateMatrixWorld(true);
    var box=new THREE.Box3();
    if(S.foldRoot) box.expandByObject(S.foldRoot);
    else S.panelMeshes.forEach(function(m){box.expandByObject(m);});
    var size=new THREE.Vector3(); box.getSize(size);
    var center=new THREE.Vector3(); box.getCenter(center);
    var maxDim=Math.max(size.x,size.y,size.z)||1;
    var dist=Math.max(maxDim*1.8,180);

    S.orbitState={
      target:center.clone(),
      spherical:new THREE.Spherical(dist,Math.PI/3,Math.PI/4),
      panSpeed:maxDim/600,
      rotateSpeed:0.006
    };
    updateCameraFromOrbit();
    S.camera3d.near=Math.max(0.01,dist/2000);
    S.camera3d.far=dist*200;
    S.camera3d.updateProjectionMatrix();
  }

  return { resize3D, updateCameraFromOrbit, init3D, fitCamera3D };
}
