// A7.2 — Ángulos de presentación del plegado (signo de cada arista del árbol). Texto idéntico al de src/main.js de 2939dbc salvo la sangría y «S.».

export function createFoldAngles(S){

  function signedDisplayAngle(edgeIdx, internalAngle){
    var sign = (S.foldSigns && typeof S.foldSigns[edgeIdx]==='number' && S.foldSigns[edgeIdx]!==0) ? S.foldSigns[edgeIdx] : 1;
    return Math.round((internalAngle || 0) * sign);
  }

  function internalAngleFromDisplay(edgeIdx, displayAngle){
    var sign = (S.foldSigns && typeof S.foldSigns[edgeIdx]==='number' && S.foldSigns[edgeIdx]!==0) ? S.foldSigns[edgeIdx] : 1;
    return (displayAngle || 0) * sign;
  }

  return { signedDisplayAngle, internalAngleFromDisplay };
}
