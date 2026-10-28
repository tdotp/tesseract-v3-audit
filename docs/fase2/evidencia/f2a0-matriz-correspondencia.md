# Matriz de correspondencia — Caja Botánica (F2A-0)

Generada por `node tools/f2/matriz-correspondencia.mjs`. Panel = conjunto de creases que lo separan (estable). Original = `caja-botanica-real` sin ajuste (ε = 0); Illustrator = `ill-real-caja-botanica` con ε experimental 0.05; histórico ×0.75 reetiquetado por geometría y normalizado (÷ 0.5625). ΔA del legacy normalizado a ×1; «representación» = |ΔA| ≤ ν·perímetro con ν = 0.005 mm. Original frente a Illustrator: **representación**.

## Paneles

| panel | areaOriginal | areaIllustrator | dA_Illustrator | areaHistX075_normalizada | centroideOriginal | legacy original ×1 | legacy Illustrator ×1 | legacy original ×0.75 |
|---|---|---|---|---|---|---|---|---|
| C0 | 316.2712 | 316.2748 | 0.0036 | 316.2744 | 197.609871,-146.197298 | P6 · geometría: borde desplazado · ΔA=2.86 | — · topología: perdido | P8 · geometría: borde desplazado · ΔA=2.86 |
| C0 C8 | 1579.9239 | 1579.9424 | 0.0185 | 1579.9399 | 197.610878,-170.896269 | P5 · geometría: borde desplazado · ΔA=19.90 | P6 · topología: fusionado con otro · ΔA=339.03 | P7 · geometría: borde desplazado · ΔA=9.88 |
| C1 | 665.5745 | 665.5825 | 0.008 | 665.5813 | 317.523473,-181.61005 | P9 · idéntico · ΔA=-0.00 | P8 · representación · ΔA=-0.00 | P11 · geometría: borde desplazado · ΔA=1.00 |
| C1 C2 C5 | 4800.1623 | 4800.2215 | 0.0592 | 4800.2122 | 317.609391,-251.143982 | P8 · idéntico · ΔA=-0.00 | P9 · representación · ΔA=0.00 | P10 · idéntico · ΔA=0.00 |
| C10 | 665.7087 | 665.7163 | 0.0076 | 665.7153 | 237.524382,-320.679515 | — · topología: perdido | P2 · geometría: borde desplazado · ΔA=0.75 | P4 · idéntico · ΔA=-0.00 |
| C2 | 665.6736 | 665.6812 | 0.0076 | 665.68 | 317.696286,-320.679614 | P10 · geometría: borde desplazado · ΔA=0.75 | P10 · geometría: borde desplazado · ΔA=0.75 | P12 · geometría: borde desplazado · ΔA=1.00 |
| C3 | 316.1947 | 316.1639 | -0.0307 | 316.1632 | 277.609888,-356.593546 | P1 · idéntico · ΔA=-0.00 | P1 · representación · ΔA=0.03 | P1 · idéntico · ΔA=-0.00 |
| C3 C11 | 1599.9598 | 1600.0123 | 0.0525 | 1600.0111 | 277.609888,-331.6457 | P0 · geometría: borde desplazado · ΔA=-19.90 | P0 · geometría: borde desplazado · ΔA=-19.93 | P0 · representación · ΔA=-0.11 |
| C4 | 1760.3207 | 1760.5495 | 0.2288 | 1760.5505 | 170.168354,-251.143982 | P4 · idéntico · ΔA=0.00 | P5 · representación · ΔA=-0.21 | P6 · idéntico · ΔA=-0.00 |
| C4 C8 C9 | 4819.6353 | 4819.7939 | 0.1586 | 4819.7904 | 197.610878,-250.895274 | P3 · geometría: borde desplazado · ΔA=-19.90 | P4 · geometría: borde desplazado · ΔA=10.06 | P5 · geometría: borde desplazado · ΔA=10.16 |
| C5 C6 C11 | 4794.7622 | 4794.6039 | -0.1583 | 4794.5967 | 277.609888,-251.700093 | P7 · representación · ΔA=-0.00 | P7 · representación · ΔA=-0.21 | P2 · geometría: borde desplazado · ΔA=10.02 |
| C6 C7 C9 C10 | 4800.1629 | 4800.149 | -0.014 | 4800.1417 | 237.610383,-251.143982 | P2 · idéntico · ΔA=-0.00 | P3 · geometría: borde desplazado · ΔA=-29.57 | P3 · geometría: borde desplazado · ΔA=-60.11 |
| C7 | 665.5745 | 665.5475 | -0.027 | 665.546 | 237.696302,-181.61005 | — · topología: perdido | — · topología: perdido | P9 · idéntico · ΔA=0.00 |

## Creases

| crease | separaMm | sobreCorteMm | une | une_Illustrator | sobreCorte_Illustrator | fuera_Illustrator | legacy original ×1 (adyacencias con esa crease) | legacy Illustrator ×1 (adyacencias con esa crease) | legacy original ×0.75 (adyacencias con esa crease) |
|---|---|---|---|---|---|---|---|---|---|
| C0 | 38.999 | 0 | C0 C8 ⟷ C0 | C0 C8 ⟷ C0 | 0.003 | 0 | 1 | 0 | 1 |
| C1 | 39.5 | 0 | C1 C2 C5 ⟷ C1 | C1 C2 C5 ⟷ C1 | 0 | 0 | 1 | 1 | 1 |
| C2 | 39.5 | 0 | C1 C2 C5 ⟷ C2 | C1 C2 C5 ⟷ C2 | 0 | 0 | 1 | 1 | 1 |
| C3 | 39.003 | 0 | C3 C11 ⟷ C3 | C3 C11 ⟷ C3 | 0 | 0.004 | 1 | 1 | 1 |
| C4 | 120 | 0 | C4 C8 C9 ⟷ C4 | C4 C8 C9 ⟷ C4 | 0 | 0 | 1 | 1 | 1 |
| C5 | 120 | 0 | C1 C2 C5 ⟷ C5 C6 C11 | C1 C2 C5 ⟷ C5 C6 C11 | 0 | 0 | 1 | 1 | 1 |
| C6 | 120 | 0 | C5 C6 C11 ⟷ C6 C7 C9 C10 | C5 C6 C11 ⟷ C6 C7 C9 C10 | 0 | 0 | 1 | 1 | 1 |
| C7 | 39.5 | 0.501 | C6 C7 C9 C10 ⟷ C7 | C6 C7 C9 C10 ⟷ C7 | 0 | 0.504 | 0 | 0 | 1 |
| C8 | 39.998 | 0 | C0 C8 ⟷ C4 C8 C9 | C0 C8 ⟷ C4 C8 C9 | 0 | 0 | 1 | 1 | 1 |
| C9 | 120 | 0 | C4 C8 C9 ⟷ C6 C7 C9 C10 | C4 C8 C9 ⟷ C6 C7 C9 C10 | 0 | 0 | 1 | 1 | 1 |
| C10 | 39.5 | 0.501 | C10 ⟷ C6 C7 C9 C10 | C10 ⟷ C6 C7 C9 C10 | 0.497 | 0 | 0 | 1 | 1 |
| C11 | 39.998 | 0 | C3 C11 ⟷ C5 C6 C11 | C3 C11 ⟷ C5 C6 C11 | 0 | 0 | 1 | 1 | 1 |
