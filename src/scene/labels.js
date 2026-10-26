// A7.2 — Etiquetas de panel (sprites P0…Pn) con su caché PRIVADA (corrección A1 de la fuga GPU). Texto idéntico al de src/main.js de 2939dbc salvo la sangría.
// document solo en makeLabelCanvas (canvas de la etiqueta); THREE es el global de index.html. labelCache es estado privado del módulo (no está en S).

export function createLabels(){

  function makeLabelCanvas(text, bg, fg){
    var c=document.createElement('canvas'); c.width=256; c.height=96;
    var x=c.getContext('2d');
    x.clearRect(0,0,c.width,c.height);
    x.fillStyle=bg;
    roundRect(x, 4, 10, c.width-8, c.height-20, 20);
    x.fill();
    x.lineWidth=2; x.strokeStyle='rgba(255,255,255,0.14)'; x.stroke();
    x.fillStyle=fg; x.font='700 38px -apple-system,BlinkMacSystemFont,Segoe UI,Tahoma,sans-serif';
    x.textAlign='center'; x.textBaseline='middle'; x.fillText(text, c.width/2, c.height/2+2);
    return c;
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  /* A1 (fuga GPU): textura y material de cada etiqueta se crean UNA vez por (texto, base) y se reutilizan;
     antes se creaban nuevos en cada applyFolding (11 texturas por evento de slider) y nunca se liberaban. */
  var labelCache = {};
  function getLabelResources(text,isBase){
    var key = text + '|' + (isBase ? 1 : 0);
    var r = labelCache[key];
    if(!r){
      var canvas=makeLabelCanvas(text, isBase ? 'rgba(37,99,235,0.96)' : 'rgba(15,23,42,0.90)', '#ffffff');
      var tex=new THREE.CanvasTexture(canvas);
      tex.minFilter=THREE.LinearFilter; tex.needsUpdate=true;
      var mat=new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false, depthWrite:false});
      r = labelCache[key] = {tex:tex, mat:mat};
    }
    return r;
  }

  function disposeLabelCache(){
    Object.keys(labelCache).forEach(function(k){
      try{ labelCache[k].mat.dispose(); }catch(ex){}
      try{ labelCache[k].tex.dispose(); }catch(ex){}
    });
    labelCache = {};
  }

  function makePanelLabelSprite(text,isBase){
    var sp=new THREE.Sprite(getLabelResources(text,isBase).mat);
    sp.scale.set(34,12.75,1);
    sp.renderOrder = 120;
    return sp;
  }

  return { makeLabelCanvas, roundRect, getLabelResources, disposeLabelCache, makePanelLabelSprite };
}
