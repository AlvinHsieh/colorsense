# MVP Scope

## Goal

Prove that ColorSense can find color-dependent information in ordinary DOM-based web interfaces and
add an understandable non-color representation without sending page data outside the browser.

## Included after v0.1 Foundation

1. Extract visible text, background, border, SVG fill, and SVG stroke colors.
2. Detect candidate indicators whose meaning appears to depend on color.
3. Add reversible semantic overlays using text, icons, shapes, or patterns.
4. Present findings and confidence in the extension popup.
5. Support a basic local color-vision profile for detector thresholds only after the core loop works.

## Explicit non-goals

- AI or cloud inference.
- Canvas, WebGL, screenshot, image, or heatmap analysis.
- Accounts, sync, billing, telemetry, or analytics.
- Automatic Chrome Web Store publishing.
- Site-specific adapters.
- Medical-grade color-vision diagnosis.
- Guaranteed semantic interpretation of every web page.

## Safety behavior

Low-confidence results must be reported as candidates rather than silently transformed. Every visual
change must be reversible, scoped to the active tab, and avoid input values and editable content.
