# AI agent showcase demo project

## Overview

## Tech Stack

## Project Structure

## Key Conventions

## Related Documentation

## Main Commands

## AI Agent Guidelines

Commit regularly and verify your own work using automated feedback loops.

### Documentation Maintenance (IMPORTANT!)

**Keep docs in sync with code changes.** After changes:

1. Check for `AGENTS.md` in affected subdirectories (or parent folders, except root)
2. Create/update `.cursor/rules/*.mdc` if patterns change
3. Create/update docs as needed, including `AGENTS.md` files in sub-folders
4. Keep the root `AGENTS.md` file up to date with the project state, learnings, references to other docs

Reference other relevant documentation files instead of duplicating their content, keep documentation files well organized and up to date, and keep references between documentation files up to date.

Use mermaid diagrams when a flowchart or diagram helps explain architecture or data flows.

### Unit/E2E/Visual Test Maintenance

Keep tests in sync with code changes.

### Verification and Feedback Loops

Verification closes the loop for autonomous work. Use fast methods during iteration, slower thorough methods after completion.
Use/create tooling that help you close the feedback loop and verify your own work.

**Run verification in cheap subagents:** Delegate automated verification work to subagents using the `Grok 4.6 High Fast` model (`cursor-grok-4.6-high-fast`) whenever possible. This is a free but intelligent model. This includes writing or updating unit/component/E2E/visual tests, running `typecheck`, linting, unit tests, component tests, E2E tests, visual regression tests, snapshot updates, and analyzing/fixing verification failures. Keep the main agent focused on orchestration and implementation context unless the check is truly trivial.

For behavior changes and UI/look-and-feel changes, also use the browser tool when needed to verify the real page behavior and visual result directly. Use it to confirm interactions, state changes, layout, and obvious regressions that automated tests or visual snapshots might miss. This complements automated verification; it does not replace `typecheck`, lint, component tests, unit tests, E2E tests, or visual tests. If the UI doesn't look good enough, iterate on improving it using the browser tool.

#### Completion Verification (Required)

### Sub-Agent Delegation

Use sub-agents to parallelize work and delegate specialized tasks and to prevent the main agent's context window from filling up. Keeping the context window for the main, orchestrator AI agent as low as possible is useful. AI agents get dumber as their context window fills up, and also get more expensive. Sub agents start with a clean context window. Make sure to include all the relevant context to sub agents.

Use the `Grok 4.6 High Fast` model for implementation, testing, and everything.

## Common mistakes

## Troubleshooting
