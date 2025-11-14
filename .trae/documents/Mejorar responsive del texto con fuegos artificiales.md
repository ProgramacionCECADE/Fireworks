## Objetivo
- Lograr que el texto formado por fuegos artificiales se adapte correctamente a pantallas altas y estrechas (smartphones en vertical), evitando que se corte, manteniendo legibilidad y estética.

## Cambios clave
- Tamaño de fuente adaptativo al ancho disponible, con límites razonables.
- Envoltura automática de líneas demasiado largas para que nunca excedan el ancho del lienzo.
- Densidad de puntos proporcional al tamaño de fuente para mantener definición del texto.
- Posicionamiento vertical dinámico según relación de aspecto (alto/ancho) para evitar que quede muy arriba/abajo.
- Recalculo robusto en `resize` para reflejar cambios de orientación/tamaño.

## Detalles técnicos
- `fireworks.js:getTextPoints` (c:\Users\Pablo\OneDrive\Documentos\CECADE\Fireworks\fireworks.js:226)
  - Sustituir el uso fijo de `fontSize`/`fontSizeMultiplier` por `computeResponsiveFontSize(textArray, cw, ch)`:
    - Calcula el tamaño de fuente máximo tal que la línea más larga no supere `cw - margin` (p. ej. `margin = Math.max(12, cw * 0.05)`).
    - Respeta límites `[min=24, max=Math.min(ch*0.12, cw*0.20)]` para legibilidad.
  - Añadir `wrapTextToWidth(textArray, maxWidth, font)` para dividir en varias líneas las entradas que aún excedan el ancho.
  - Hacer el `gap` de muestreo dependiente del tamaño de fuente: `gap = clamp(Math.round(fontSize/14), 4, 10) * pointsGapMultiplier` para mantener la densidad de puntos proporcional.
  - Centrado horizontal con margen: `x = margin + (cw - margin*2 - textWidth) / 2`.
  - Mantener el cálculo de `lineHeight = fontSize * 1.2`.

- `fireworks.js:textPositionY` (c:\Users\Pablo\OneDrive\Documentos\CECADE\Fireworks\fireworks.js:32)
  - Ajuste dinámico en cada cálculo de puntos: `const aspect = ch / cw; textPositionY = aspect > 1.6 ? 0.35 : 0.5` para pantallas muy altas.
  - Usar este valor en `startY` como ya se hace.

- `fireworks.js:handleResize` (c:\Users\Pablo\OneDrive\Documentos\CECADE\Fireworks\fireworks.js:377)
  - Mantener la detección de móvil por `cw < 768`.
  - Forzar que el próximo ciclo de texto re-genere puntos con nuevos parámetros:
    - Si `textFireworkMode` está activo: recomputar `textPoints = getTextPoints(wrappedTextMessage)` tras actualizar `cw/ch`.
    - Si no está activo pero hay `textPoints` calculados previamente: vaciar `textPoints = []` para reconstruir cuando entre en modo texto.

- Opcional (si se desea mayor nitidez): escalar por `devicePixelRatio` en el canvas, con `ctx.scale(dpr, dpr)`, cuidando que la lógica de posiciones use coordenadas visuales. No es imprescindible para la mejora solicitada.

## Verificación
- Pruebas en tamaños representativos:
  - 360x800, 375x812, 412x915 (Android/iOS vertical): texto completo, centrado con margen, densidad consistente.
  - 640x360 (horizontal en móvil): texto se oculta decoraciones ya previstas en CSS; validar que el texto sigue ajustado.
  - 412x1000 (pantalla muy alta): comprobar que `textPositionY≈0.35` evita que el texto quede demasiado bajo.
- Cambiar orientación (rotate) y verificar que `resize` re-calcula puntos sin cortes.

## Entregables
- Actualización de `fireworks.js` con:
  - `computeResponsiveFontSize` y `wrapTextToWidth`.
  - Uso de tamaño de fuente y `gap` dinámicos en `getTextPoints`.
  - Ajuste de `textPositionY` por relación de aspecto.
  - Mejora de `handleResize` para regeneración confiable de puntos.
- Sin cambios en CSS/HTML excepto si se activa la opción de `devicePixelRatio`.