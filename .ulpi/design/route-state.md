# Route State workspace

Identity lock: every screen must read as the same product if placed side by side. Bind to `.ulpi/design/DESIGN.md`.

## Goal

A recruiter lands in the product, starts a trip in one click, and sees LangGraph execution as a living atlas.

## Layout

Desktop (>=1280): atlas sheet 60% primary stage, journal 40% supporting rail, inspector as a sheet.
Laptop (1024-1279): same split, tighter dossier.
Tablet: 200px atlas peek + journal. Peek opens a full atlas sheet.
Mobile: 48px masthead, 120-144px execution rail, journal, sticky composer. All HITL and inspection work in sheets.

## Primary flow

Land anonymous -> empty atlas + first question -> starter or chips -> gather missing fields -> discover or research -> destination interrupt -> same thread resumes -> itinerary -> optional tradeoff -> revise.

## Components

- `AppShell`: skip link, masthead, journal, atlas.
- `OrchestrationAtlas`: React Flow canvas with static `GRAPH_SPEC` nodes and a vermillion execution path.
- `JournalTurn`: question, chips, streamed prose, HITL decision frame.
- `OptionChipGroup`: radiogroup, 44px targets.
- `TripDossier`: hairline strip, Destination / Dates / Travelers / Budget.
- `NodeInspector`: L0 caption, L1 tools/evidence, L2 public diffs and usage.
- `Composer`: labeled textarea, image attach, send.
- `StarterStrip`: four text buttons sending starter ids.
- `MemorySheet`: inspect / edit / delete session preferences.
- `ReplayBanner`: honest recorded-run label.

## States

Empty, gathering, streaming, researching, HITL destination, HITL tradeoff, itinerary ready, image attached, off-scope, rate limited, error, offline, refresh mid-run, replay, budget exhausted.

## Accessibility

Visible 2px accent focus, keyboard chips and HITL, polite live region for latest node label only, reduced motion snaps the path, 44px targets, AA contrast from DESIGN.md.

## Acceptance

- First screen is a question + chips + starters, not an empty composer.
- Atlas is primary on desktop.
- Route line tracks real graph events.
- HITL is a ranked decision list synchronized to graph branches.
- Activity uses the public event vocabulary only.
- Replay is labeled and uses the same event protocol.
