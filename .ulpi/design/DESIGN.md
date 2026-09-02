---
project: Route State
register: product
aesthetic_direction: editorial / magazine, cartographic atelier
color_strategy: restrained
design_system: radix + owned themed components
design_variance: 7
motion_intensity: 6
visual_density: 5
---

# DESIGN.md

Every screen must read as the same product if placed side by side.

## Design Read

A correspondent's desk on cool atlas paper. The trip is a conversation. The graph writes itself in the margin.

## Signature

The Orchestration Atlas: a single vermillion execution path drawn across a bright atlas sheet. Node and edge states mirror the live LangGraph run. The line is the graph, not a geographic map overlay.

## Color (locked)

Neutrals are cyan-tinted. One accent. No cream paper, no AI purple.

| role | OKLCH | hex | use | contrast |
|---|---|---|---|---|
| background | `oklch(0.985 0.008 230)` | `#F2F7F9` | App canvas | - |
| surface | `oklch(0.965 0.012 228)` | `#E8F0F4` | Thread wash, instruments | - |
| elevated | `oklch(0.992 0.004 230)` | `#F7FBFC` | Composer, sheets, HITL | - |
| text | `oklch(0.24 0.028 250)` | `#1A2740` | Body, headings | 13.8:1 on background |
| muted | `oklch(0.42 0.022 248)` | `#4A5870` | Secondary labels | 6.7:1 |
| subtle | `oklch(0.50 0.018 248)` | `#58687C` | Captions | 5.3:1 |
| border | `oklch(0.88 0.014 230)` | `#D3DEE4` | Hairlines | - |
| accent | `oklch(0.50 0.175 28)` | `#B33A26` | Buttons, focus, committed path | 5.5:1 text / 5.7:1 white-on-accent |
| map-water | `oklch(0.94 0.028 230)` | `#E4F1F6` | Atlas wash | graphic |
| map-land | `oklch(0.93 0.018 160)` | `#E6F0EA` | Land wash | graphic |
| map-line | `oklch(0.78 0.02 230)` | `#B7C8D0` | Grid hairlines | graphic |
| success | `oklch(0.45 0.09 155)` | `#2F7A55` | Recovered tool | 4.6:1 |
| warning | `oklch(0.55 0.12 75)` | `#A06A12` | Rate limit | 4.6:1 |
| danger | `oklch(0.48 0.16 25)` | `#B33A26` | Blocking error | same family as accent |
| info | `oklch(0.48 0.07 240)` | `#3B5F86` | Source type, model tier | 5.1:1 |

Dark mode is a night chart, not OLED glow.

| role | OKLCH | hex |
|---|---|---|
| background | `oklch(0.17 0.025 245)` | `#141C2A` |
| surface | `oklch(0.21 0.028 245)` | `#1B2536` |
| elevated | `oklch(0.25 0.03 245)` | `#232E42` |
| text | `oklch(0.93 0.015 230)` | `#E8F0F4` |
| muted | `oklch(0.75 0.02 230)` | `#B7C4D1` |
| accent | same `#B33A26` fill with `#F7FBFC` text | |

60 / 30 / 10: cool paper / atlas wash / vermillion.

## Type (locked)

| role | family | use |
|---|---|---|
| display | Newsreader | Destination name, day title, opening question |
| body | Geist | Conversation |
| utility | Geist Mono | Graph pulse, source type |

No Inter, Arial, Fraunces, Instrument Serif, Playfair, or Space Grotesk in product chrome.

## Scales (locked)

- spacing: `0 2 4 8 12 16 20 24 32 40 48 64`
- radius: `sm 4`, `md 8`, `lg 12` atlas sheet only, `full` chips and pins
- shadow: `0 12px 40px oklch(0.24 0.028 250 / 0.08)` on the atlas sheet only
- motion: 120 / 300 / 500, easing `cubic-bezier(0.16, 1, 0.3, 1)`, no bounce
- z: `base 0, sticky 30, atlasExpand 40, sheetBackdrop 45, sheet 50, tooltip 60, toast 70, skipLink 80`
- icons: Phosphor Light, stroke 1.5

## Voice

Plain, specific, guiding. Stable verbs: Start, Continue, Choose destination, Build itinerary, Revise, Save preference, Try again.

No em-dashes. No elevate / unleash / seamless. No fake match percentages.
