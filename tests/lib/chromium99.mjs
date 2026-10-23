// Listas de APIs y funciones CSS posteriores a Chromium 99 (CEF rama 4844, V8 9.9) para detectar dependencias no soportadas.
// Versiones de introducción: CONOCIMIENTO GENERAL (MDN/chromestatus), no verificadas contra la fuente en esta sesión; la lista es una red de seguridad, no una certificación.
export const JS_POST99 = [
  ['.toSorted(', 'Array.prototype.toSorted (110)'], ['.toReversed(', 'Array.prototype.toReversed (110)'], ['.toSpliced(', 'Array.prototype.toSpliced (110)'], ['.with(', 'Array.prototype.with (110)'],
  ['Object.groupBy', 'Object.groupBy (117)'], ['Map.groupBy', 'Map.groupBy (117)'], ['Promise.withResolvers', 'Promise.withResolvers (119)'], ['Promise.try', 'Promise.try (128)'], ['Array.fromAsync', 'Array.fromAsync (121)'],
  ['.isWellFormed(', 'String.isWellFormed (111)'], ['.toWellFormed(', 'String.toWellFormed (111)'], ['.union(', 'Set.union (122)'], ['.intersection(', 'Set.intersection (122)'], ['.symmetricDifference(', 'Set.symmetricDifference (122)'],
  ['.isSubsetOf(', 'Set.isSubsetOf (122)'], ['URL.canParse', 'URL.canParse (120)'], ['AbortSignal.any', 'AbortSignal.any (116)'], ['AbortSignal.timeout', 'AbortSignal.timeout (103)'], ['.transferToFixedLength(', 'ArrayBuffer.transferToFixedLength (114)'],
  ['.checkVisibility(', 'Element.checkVisibility (105)'], ['startViewTransition', 'View Transitions (111)'], ['JSON.rawJSON', 'JSON.rawJSON (114)'], ['Iterator.from', 'Iterator helpers (122)'], ['Intl.DurationFormat', 'Intl.DurationFormat (129)'],
  ['Float16Array', 'Float16Array (135)'], ['Response.json(', 'Response.json (105)'], ['.showPopover(', 'Popover API (114)'], ['scheduler.yield', 'scheduler.yield (129)'],
];
export const CSS_POST99 = [[/:has\(/, ':has() (105)'], [/@container\b|container-type/, 'container queries (105)'], [/color-mix\(/, 'color-mix() (111)'], [/\b\d+(?:\.\d+)?(?:dvh|svh|lvh|dvw|svw|lvw)\b/, 'unidades dvh/svh/lvh (108)'],
  [/(^|\s)&\s*[.:#\w]/m, 'CSS nesting con & (112)'], [/text-wrap\s*:\s*(balance|pretty)/, 'text-wrap balance/pretty (114/117)'], [/light-dark\(/, 'light-dark() (123)'], [/\b(oklch|oklab|lab|lch)\(/, 'colores oklch/oklab/lab/lch (111)'],
  [/subgrid/, 'subgrid (117)'], [/@starting-style/, '@starting-style (117)'], [/field-sizing/, 'field-sizing (123)'], [/anchor-name|position-anchor/, 'anchor positioning (125)'], [/@scope\b/, '@scope (118)']];
// Sintaxis ES de V8 9.9 (Chromium 99): ES2021 completo, clases con campos privados, static blocks, error cause, at(), hasOwn(), findLast() — todo soportado; NO: decoradores, `using`, import attributes, RegExp /v, top-level await fuera de módulos.
