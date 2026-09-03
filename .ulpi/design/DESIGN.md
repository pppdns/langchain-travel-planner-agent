---
project: Route State
register: product
aesthetic_direction: night operations desk
color_strategy: restrained
design_system: radix + owned themed components
design_variance: 6
motion_intensity: 5
visual_density: 6
---

# DESIGN.md

Every screen must read as the same product if placed side by side.

## Design Read

A night operations desk. The trip is a typographic log. Destinations are machined plates. The graph is an amber path on a dark chart.

## Signature

The Orchestration Atlas: a single amber execution path across a graphite chart. Node states mirror the live LangGraph run.

## Color (locked)

Night only. Graphite neutrals. One amber accent. No cyan paper, no cream, no AI purple, no neon glow.

| role | OKLCH | hex | use | contrast |
|---|---|---|---|---|
| background | `oklch(0.18 0.018 265)` | `#161922` | App canvas | - |
| surface | `oklch(0.22 0.020 265)` | `#1D2230` | Plates, thread | - |
| elevated | `oklch(0.26 0.022 265)` | `#252B3B` | Composer, selected plate, sheets | - |
| text | `oklch(0.93 0.014 85)` | `#F0EDE4` | Body, headings | 12.4:1 on background |
| muted | `oklch(0.74 0.022 80)` | `#B9B19F` | Secondary | 7.1:1 |
| subtle | `oklch(0.62 0.020 80)` | `#948C7C` | Captions | 4.6:1 |
| border | `oklch(0.32 0.018 265)` | `#3A4154` | Hairlines, bezels | - |
| accent | `oklch(0.76 0.140 70)` | `#E8A84A` | Path, focus, live node | 7.2:1 on background |
| ink | `oklch(0.18 0.030 60)` | `#1A1408` | Text on amber fills | 8.9:1 on accent |
| map-water | `oklch(0.20 0.022 250)` | `#1A2030` | Chart wash | graphic |
| map-land | `oklch(0.21 0.018 160)` | `#1C2422` | Chart wash | graphic |
| map-line | `oklch(0.30 0.016 250)` | `#343B4C` | Grid | graphic |
| success | `oklch(0.68 0.090 155)` | `#5EA87A` | Recovered tool | 5.2:1 |
| warning | `oklch(0.76 0.140 70)` | `#E8A84A` | Rate limit | same as accent |
| danger | `oklch(0.68 0.150 28)` | `#D36A4A` | Blocking error | 4.8:1 |
| info | `oklch(0.70 0.050 230)` | `#8FA3B8` | Source type, model tier | 5.4:1 |

60 / 30 / 10: graphite / plate / amber.

## Type (locked)

| role | family | use |
|---|---|---|
| display | Geist | Wordmark, destination, day title, opening question |
| body | Geist | Conversation |
| utility | Geist Mono | Coords, graph pulse, source type |

No Inter, Arial, Fraunces, Instrument Serif, Newsreader, Playfair, or Space Grotesk in product chrome.

## Scales (locked)

- spacing: `0 2 4 8 12 16 20 24 32 40 48 64`
- radius: `sm 6`, `md 10`, `lg 14` plates and composer, `full` chips
- shadow: `0 18px 50px oklch(0.12 0.03 265 / 0.45)` on atlas and selected plate
- motion: 120 / 300 / 500, easing `cubic-bezier(0.16, 1, 0.3, 1)`, no bounce
- z: `base 0, sticky 30, atlasExpand 40, sheetBackdrop 45, sheet 50, tooltip 60, toast 70, skipLink 80`
- icons: Phosphor Light, stroke 1.5

## Voice

Plain, specific, guiding. Stable verbs: Start, Continue, Choose destination, Build itinerary, Revise, Save preference, Try again.

No em-dashes. No elevate / unleash / seamless. No fake match percentages.
