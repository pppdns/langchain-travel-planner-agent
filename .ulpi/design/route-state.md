# Route State workspace

Identity lock: every screen must read as the same product if placed side by side. Bind to `.ulpi/design/DESIGN.md`.

## Goal

A recruiter lands in a conversation. The planner thinks, types the first question, then offers starters. The same thread gathers facts, pauses for a destination, and writes an itinerary. LangGraph stays visible in the margin as an amber path.

## Layout

Conversation is the product. There are no stage pages. The shell is a night operations desk.

Desktop (>=1280): a left conversation column and a persistent atlas chart in the right margin. Inspector sits under the atlas, same page.

Laptop (1024-1279): conversation is primary. Atlas collapses to the living graph sentence; the sheet opens in place.

Mobile: full-width thread, composer tray, 44px targets. Atlas opens as a sheet from the graph sentence. HITL and itinerary stay in the thread at 390px.

## Primary flow

Land anonymous -> opening question in the thread -> type or pick a start -> answers appear as instruments under the last reply -> destination plates in the same turn -> itinerary unfolds in the thread -> revise by typing.

Drive instruments from `tripState` and `pendingInterrupt`. Drive history from `messages[]`. Never show raw starter IDs. A typed reply that matches a listed option resumes the interrupt. Historical interrupt events do not stay on screen after the trip moves on.

## Components

- `Conversation`: chat thread with thinking, typing, opening, instruments, composer tray.
- `Composer`: always-on labeled textarea in a nested bezel, Enter to send, Shift+Enter for a new line.
- `ChoiceInstrument`: keyboard plates for gathering.
- `DestinationInstrument`: machined plates from `candidateDestinations`, arrow keys and Enter.
- `FolioInstrument`: day list in the assistant turn, expand a day for notes.
- `GraphPulse`: one living caption from the latest public `graph` event.
- `AtlasCompanion`: persistent React Flow chart in the margin; sheet on small screens.
- `NodeInspector`: L0 caption, L1 tools/evidence, L2 public diffs and usage.
- `ReplayBanner`: honest recorded-run label.

## States

Empty, gathering, streaming, HITL destination, researching, planning, HITL tradeoff, itinerary ready, off-scope, rate limited, error, offline, refresh mid-run, replay, budget exhausted.

## Accessibility

Visible 2px accent focus, keyboard instruments and HITL, polite live region for latest node label only, reduced motion snaps the path, 44px targets, AA contrast from DESIGN.md.

## Acceptance

- First screen is a typed question in a conversation plus a composer, not a card gallery.
- The thread never navigates away. Instruments arrive in the last turn.
- Atlas is visible without changing pages on desktop.
- Route line tracks real graph events.
- Destination HITL is a ranked plate set synchronized to graph branches. Number keys, Enter, or a typed name all choose.
- Activity uses the public event vocabulary only.
- Replay is labeled and uses the same event protocol.
