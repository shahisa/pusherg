# pusherg

## What This Is

A zero-config npx CLI tool that installs git hooks into any JS/TS project. Before a push goes through, it runs the project's build and test commands, shows a clear pass/fail summary, and gives the developer an interactive prompt to continue or abort.

## Core Value

Zero-config auto-detection with interactive feedback UX — developers can protect their pushes with one command, no configuration needed.

## Requirements

### Validated

- [x] Auto-detection of build, test, and lint scripts from package.json — Validated in Phase 1: Foundation
- [x] Package manager detection (npm, yarn, pnpm) — Validated in Phase 1: Foundation

### Active

- [ ] One-command setup via `npx pusherg init`
- [ ] Pre-push hook execution with build and test checks
- [ ] Colored pass/fail output with timing information
- [ ] Interactive "Push anyway?" prompt on failure
- [ ] Support for --force flag to skip checks
- [ ] Clean uninstall via `pusherg remove` command
- [ ] Status command to show current configuration

### Out of Scope

- Pre-commit hooks — deferred to post-MVP
- Monorepo support — deferred to post-MVP
- Custom config files (.pushergrc) — deferred to post-MVP
- CI-awareness auto-detection — deferred to post-MVP
- Watch mode for local dev — deferred to post-MVP
- TypeScript project detection — deferred to post-MVP

## Current Milestone: v1.0 MVP

**Goal:** Ship a zero-config npx CLI tool that runs build/test checks before git push with interactive feedback.

**Target features:**
- One-command setup via `npx pusherg init`
- Auto-detection of build, test, and lint scripts from package.json
- Pre-push hook execution with build and test checks
- Colored pass/fail output with timing information
- Interactive "Push anyway?" prompt on failure
- `--force` flag to skip checks
- Package manager detection (npm, yarn, pnpm)
- Clean uninstall via `pusherg remove`
- Status command to show current configuration

## Context

Existing pre-push tools (pre-push, prepush-hook, git-pre-push) are 5-10 years old, poorly maintained, have no interactive prompts, no colored output, no auto-detection, and require manual configuration. Husky is excellent but is a low-level primitive — users must wire everything up themselves.

pusherg = Husky under the hood + zero-config auto-detection + interactive feedback UX

Target users: JavaScript/TypeScript developers who want git hook protection without configuration overhead.

## Constraints

- **Tech Stack**: Node.js >=18, ESM modules
- **Dependencies**: commander, chalk, ora, execa, inquirer, husky (as peer dependency)
- **Timeline**: 4-day ship to npm
- **Compatibility**: Must work with npm, yarn, and pnpm package managers
- **Distribution**: Published as public npm package, invoked via npx

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Husky under the hood | Mature, reliable git hook management | — Pending |
| ESM modules only | Modern standard, Node 18+ baseline | — Pending |
| Zero-config by default | Remove friction for adoption | — Pending |
| Interactive prompts on failure | Better DX than silent failures | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: April 3, 2026 — Phase 1 Foundation complete (detect, runner, reporter, prompt modules with 43 tests)*