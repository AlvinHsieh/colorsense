# Product Definition

## Vision

Color should never be the only way to understand the web.

ColorSense is a browser-level semantic accessibility layer. It identifies information that depends
on color, determines the signal's meaning from available page semantics, and adds an accessible
representation such as text, an icon, a shape, or a pattern.

## Positioning

Operating-system filters change how colors look. ColorSense is designed to explain what a color
means. The two approaches are complementary.

```text
Detect color dependency -> Understand context -> Transform representation
```

## Initial users

- People with red/green, blue/yellow, or partial color-vision differences.
- People using low-quality projectors, grayscale displays, or high-glare environments.
- Developers and accessibility testers finding color-only interfaces.

## Product principles

1. Meaning before recoloring.
2. Local-first and private by default.
3. User-triggered, reversible changes.
4. Explicit confidence; never invent semantics silently.
5. Open rules and deterministic behavior before AI inference.
6. Minimal browser permissions.

## North-star signal

`Verified semantic fixes per active user`: the number of detected color-dependent signals that a
user can understand through a non-color representation and confirms as useful.
