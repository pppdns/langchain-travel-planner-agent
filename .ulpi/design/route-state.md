# Route State workspace

Identity lock: every screen must read as the same product if placed side by side. Bind to `.ulpi/design/DESIGN.md`.

## Goal

A recruiter lands in the product, starts a trip in one click, and sees a usable itinerary. LangGraph execution stays visible as a compact rail and an inspectable atlas overlay.

## Layout

The workspace is a Trip Studio. Destinations and the day folio are the hero. The atlas is not the default canvas.

Desktop (>=1280): full-width studio. 72px execution rail above the hero. React Flow opens as a sheet when a rail node is clicked. Inspector lives in that sheet.

Laptop (1024-1279): same hierarchy, tighter plates.

Tablet and mobile: 48px masthead, 120px execution rail, studio hero. HITL, folio, and atlas inspection work in the same column or a sheet. Complete at 390px.

## Primary flow

Land anonymous -> four starter plates -> gather missing fields as visual pickers -> destination cards -> day folio -> optional revise drawer.

Drive the hero from `tripState.currentPlanningStage` and `pendingInterrupt`, not from a chat transcript.

| Stage | Hero | User action |
|---|---|---|
| Empty / intake | Four starter plates | Click a plate |
| Gathering | One visual picker (nights, trip type) | Click a tile |
| Discovering | Three card skeletons + rail motion | Wait |
| Awaiting destination | Three destination cards | Choose one |
| Researching / planning | Chosen destination plate + folio assembling | Watch |
| Complete | Destination hero + day folio | Revise |
| Off-scope | Short redirect card + the four plates again | Start a trip |

## Components

- `TripStudio`: stage switcher and main column.
- `StarterPlate`: full-bleed cartographic card. Copy stays the existing starter labels.
- `DestinationCard`: Newsreader name, country, trait pictograms, qualitative fit, evidence titles. Source is `tripState.candidateDestinations`.
- `DayFolio`: one plate per day with stop tiles keyed by `kind`.
- `ExecutionRail`: compact `GRAPH_SPEC` sequence. Vermillion for committed edges. Latest public `graph` caption is the activity feed.
- `TripPlates`: Destination / Dates / Travelers / Budget, filled as state arrives.
- `ReviseDrawer`: composer only after an itinerary exists, plus visual revision actions.
- `OrchestrationAtlas`: React Flow canvas in an overlay sheet. Do not delete the graph.
- `NodeInspector`: L0 caption, L1 tools/evidence, L2 public diffs and usage.
- `ReplayBanner`: honest recorded-run label.

## States

Empty, gathering, discovering, HITL destination, researching, planning, HITL tradeoff, itinerary ready, off-scope, rate limited, error, offline, refresh mid-run, replay, budget exhausted.

## Accessibility

Visible 2px accent focus, keyboard pickers and HITL, polite live region for latest node label only, reduced motion snaps the path, 44px targets, AA contrast from DESIGN.md.

## Acceptance

- First screen is four starter plates, not an empty composer.
- Studio is primary. Atlas is a rail plus overlay.
- Route line tracks real graph events.
- Destination HITL is ranked cards synchronized to graph branches.
- Activity uses the public event vocabulary only.
- Replay is labeled and uses the same event protocol.
- No persistent chat transcript. No raw starter IDs as user-visible text.
