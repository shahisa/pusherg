# Project Research Summary

**Project:** pusherg
**Domain:** Zero-config npx pre-push CLI tool (Node.js)
**Researched:** 2026-04-03
**Confidence:** HIGH

## Executive Summary

pusherg occupies a genuine gap in the git hook tooling ecosystem. Every existing tool — husky, lefthook, lint-staged, simple-git-hooks — requires developers to manually write hook logic. None auto-detect what build/test/lint scripts exist in a project. None offer an interactive "push anyway?" prompt when checks fail. pusherg is best understood as Husky primitives + auto-detection + interactive feedback UX, and the recommended way to build it is a thin CLI entry layer (commander) orchestrating pure service modules (detect, runner, reporter, prompt) that are independently testable.

The architecture is straightforward: a shell stub hook template invokes `pusherg run` on each push, which reads `package.json` at runtime, spawns detected scripts sequentially via execa, reports colored results with timing via chalk/ora, and optionally prompts the user if any check fails. The entire system fits in 8 source files. All chosen dependencies (commander, chalk, ora, execa, @inquirer/prompts) are ESM-only in their current major versions, so the project should be ESM from the start. A critical constraint: Node 18.0.0–18.18.x won't work with execa v9; the minimum must be declared as `>=18.19.0`.

The single highest-risk implementation detail is the stdin/TTY conflict inside git hooks. Git pre-push hooks receive push ref data on stdin, and `process.stdin.isTTY` is always falsy inside a hook context, which causes prompt libraries to hang or silently auto-answer. The fix is a one-line shell redirect (`exec < /dev/tty`) in the hook template plus a programmatic TTY check fallback in the Node runner. This must be tested with real `git push` invocations, not just direct script execution. Get this right before anything else interactive is built.

## Key Findings

### Recommended Stack

The full dependency set is small and well-justified. All packages are ESM-only in their pinned major versions, which matches the project's `"type":"module"` commitment. Version pins are constrained by the Node 18 baseline: commander must be ^13 (not ^14), ora must be ^8 (not ^9), @inquirer/prompts must be ^7 (not ^8), and vitest must be ^3 (not ^4) — all because v-next of each requires Node 20+. Husky is a runtime dependency for hook installation; however, the architecture research identifies a viable alternative of writing hook files directly and using `git config core.hooksPath` via execa, which would reduce the footprint in the target project. Either approach works; the direct approach is preferable for a zero-config tool with minimal-dependency aspirations.

**Core technologies:**
- Node.js >=18.19.0: Runtime baseline — execa v9 requires exactly this minimum, not just 18.x
- commander ^13.1.0: CLI parsing — industry standard for multi-subcommand CLIs; v13 is last Node 18 compatible major
- chalk ^5.4.1: Terminal color output — ESM-only, zero deps, actively maintained
- ora ^8.2.0: Spinners — v8 is the last Node 18 compatible series; v9 requires Node 20+
- execa ^9.6.1: Subprocess execution — purpose-built for CLI tools; better errors, streaming, typed results
- @inquirer/prompts ^7.10.1: Interactive prompts — official successor to legacy inquirer; v7 is last Node 18 compatible series
- husky ^9.1.7: Hook installation in target project — or replace with direct `git config core.hooksPath` approach
- vitest ^3.2.4: Testing — native ESM, zero transform config needed; v3 is last Node 18 compatible series

### Expected Features

The competitive gap is clear: all competitors require manual hook configuration. pusherg's entire value proposition is auto-detection plus interactive feedback. Every feature on the P1 list flows directly from this positioning.

**Must have (table stakes):**
- `npx pusherg init` — one-command setup; users expect npx-installable tooling
- Hook installation to `.husky/` or `.git/hooks/` — compatible with established directory conventions
- Pre-push hook execution that aborts push on non-zero exit — the core contract
- Auto-detection of build/test/lint scripts from package.json — the primary differentiator and zero-config promise
- Package manager detection (npm/yarn/pnpm via lockfile) — can't run `yarn test` if you detect npm
- Colored pass/fail output with timing per script — meaningful UX improvement over plain-text peers
- Interactive "Push anyway?" prompt on failure with TTY detection — the feature no competitor offers
- `pusherg remove` clean uninstall — users expect reversibility
- `pusherg status` show installed hooks and detected scripts — confidence-builder for setup verification
- `--force` flag to skip checks for a single push — explicit opt-out without needing `--no-verify`
- Non-TTY fallback (auto-abort in CI) — correctness requirement, not UX

**Should have (competitive):**
- Spinners during check execution (ora) — prevents user confusion during long builds
- `--no-verify` bypass acknowledgment in docs — sets accurate expectations
- `npx pusherg@latest` canonical invocation in README — mitigates stale npx cache problem

**Defer (v2+):**
- Bun package manager detection — add when adoption warrants it
- Custom `.pushergrc` config file — defeats zero-config pitch; defer until users demand it
- Pre-commit hook support — different problem space (staged files); recommend husky + lint-staged instead
- Monorepo support — fundamentally different product; lefthook already owns this
- Parallel script execution — safe to defer; sequential is correct for v1

### Architecture Approach

The recommended architecture is four clean layers: a thin bin/cli.js entry point that only wires commander; command modules (init, run, status, remove) that orchestrate without owning logic; pure service modules (detect, runner, reporter, prompt) that take inputs and produce outputs with no side effects or global state; and external boundaries (filesystem, git CLI, child processes). The `run` command passes a single context object (`{ cwd, packageManager, scripts, projectName }`) through the pipeline. Services are pure functions, making them independently unit-testable without spawning the full CLI process.

**Major components:**
1. `bin/cli.js` — thin commander wiring only; no logic
2. `src/detect.js` — reads package.json, returns scripts array and package manager; pure, no side effects
3. `src/runner.js` — executes scripts via execa sequentially, returns result objects with timing and exit codes
4. `src/reporter.js` — formats and prints results using chalk/ora; only outputs, returns nothing
5. `src/prompt.js` — wraps @inquirer/prompts for the "Push anyway?" prompt; isolated, easy to mock
6. `src/commands/run.js` — orchestrates the push flow: detect → run → report → prompt
7. `src/commands/init.js` — orchestrates hook installation: detect → write template → chmod → report
8. `templates/pre-push` — static shell stub; written to disk by init; calls `pusherg run` via npx

Build order matters: service modules first (detect, runner, reporter, prompt), then command modules that depend on them, then the CLI entry point. Test each service in isolation before wiring commands.

### Critical Pitfalls

1. **Interactive prompts fail inside git hooks (stdin is not a TTY)** — Git consumes the hook's stdin for push ref data. Add `exec < /dev/tty` to the hook template AND check `process.stdin.isTTY` in the Node runner; default to auto-abort (exit 1) when not a TTY. Must be tested with actual `git push`, not direct script invocation.

2. **Pre-push stdin data conflicts with TTY redirect** — Git sends push ref metadata on stdin; the interactive prompt needs stdin for keyboard input. These are mutually exclusive on the same file descriptor. Solution: redirect stdin from `/dev/tty` in the hook shell script before Node starts. For MVP, the push ref data (which branches are being pushed) is not needed — document this decision.

3. **Hook file loses executable bit** — `fs.writeFile` writes with mode `0o666` (no execute bit); git silently ignores non-executable hooks. Always call `chmod(hookPath, 0o755)` immediately after writing. Include an executable bit check in `pusherg status` and unit test the mode after init.

4. **npx serves a stale cached version** — npx caches packages and may install an old version. Document `npx pusherg@latest init` as the canonical invocation in README and CLI help output. Consider a version-check warning in the init command.

5. **Output to stdout is suppressed inside git hooks** — some git environments suppress stdout from hooks; stderr is always shown. Write all hook output (reporter, errors) to `process.stderr`, not `process.stdout`.

## Implications for Roadmap

Based on research, the architecture's build-order dependency graph directly dictates phase structure. Services must exist before commands; the hook template cannot be meaningfully tested without a real push flow.

### Phase 1: Foundation — Project scaffolding and service layer

**Rationale:** The architecture explicitly defines that service modules (detect, runner, reporter, prompt) have no internal dependencies and must be built first. Commander CLI entry point and package.json setup establish the project before any features are built.
**Delivers:** A tested, importable service layer: `detect.js` (reads and parses package.json scripts + lockfile detection), `runner.js` (execa subprocess wrapper with timing), `reporter.js` (chalk-based output formatting), `prompt.js` (inquirer TTY-aware wrapper).
**Addresses:** Package manager detection, script auto-detection, colored output — the building blocks for all user-facing features.
**Avoids:** Anti-pattern of putting logic in bin/cli.js; anti-pattern of using shell string concatenation for scripts; silent error catching.

### Phase 2: Core — Hook installation and the run command

**Rationale:** The init and run commands are the product. init installs the hook; run executes it. These depend on the Phase 1 services and together constitute the MVP.
**Delivers:** `pusherg init` that detects scripts and installs a working hook file; `pusherg run` that executes detected scripts with colored output, timing, and an interactive prompt on failure; the `templates/pre-push` shell stub with correct stdin handling.
**Addresses:** All P1 features — one-command setup, hook installation, pre-push execution, interactive prompt, `--force` flag, non-TTY fallback.
**Avoids:** Critical pitfalls 1 (TTY), 2 (stdin conflict), 3 (stale npx cache — document @latest in init help), 4 (executable bit — chmod immediately after write).
**Needs deeper research flag:** The stdin/TTY hook interaction is the highest-risk implementation area. Requires testing with actual `git push` in a real repo before this phase is considered complete.

### Phase 3: Management commands — status and remove

**Rationale:** status and remove depend on the same detect/reporter services and the hook file format established in Phase 2. Natural grouping; lower risk than Phase 2.
**Delivers:** `pusherg status` showing installed hooks and scripts that will run; `pusherg remove` that cleanly uninstalls the hook and restores git config.
**Addresses:** Clean uninstall (table stakes), status visibility (differentiator), executable bit check in status (pitfall 4 recovery path).
**Avoids:** Path traversal in remove — validate resolved path is inside `.git/hooks/` before deletion.

### Phase 4: Polish and publishing — UX refinements and npm publish prep

**Rationale:** Spinners, error handling improvements, and documentation are the final layer of polish before public release. These cannot be done responsibly before the core works.
**Delivers:** Ora spinners during script execution; clean error message formatting (no raw stack traces by default); `--debug` flag for verbose output; README with accurate expectations (--no-verify bypass, @latest invocation, CI usage, Windows limitations); npm publish prep.
**Addresses:** P2 features (spinners), UX pitfalls (raw stack traces, output suppression, "push anyway?" defaults to No), pitfall 5 (--no-verify documentation).
**Avoids:** Implying pusherg "prevents" bad pushes absolutely; shipping with stdout-only output in hook context.

### Phase Ordering Rationale

- Services before commands is dictated by the dependency graph in ARCHITECTURE.md — this is not a preference, it is a constraint.
- Hook installation (init) before management commands (status/remove) because status reads the hook file format that init establishes.
- Polish last because UX improvements have no value if the core push-flow isn't working correctly.
- The stdin/TTY pitfall is the single highest implementation risk. Phase 2 is where it surfaces and must be resolved with integration testing against a real git push, not mocked.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** The stdin/TTY interaction inside git hooks is well-documented as a pain point but the exact implementation strategy (shell-level vs. Node-level TTY reopening, Windows compatibility scope) requires a concrete decision. The PITFALLS.md documents the pattern but choosing between the shell-level `exec < /dev/tty` approach vs. Node-level `/dev/tty` file descriptor opening for Inquirer needs a tested proof-of-concept before the phase is planned in detail.
- **Phase 4 (Windows):** The `exec < /dev/tty` redirect fails on Windows Git Bash. The scope decision (support Windows or document as unsupported) should be made before Phase 2 hook template is finalized, but the Windows-specific solution needs its own research if Windows support is in scope.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Pure Node.js service modules with well-understood libraries (execa, chalk, @inquirer/prompts). No novel patterns; architecture is directly derived from lint-staged and husky patterns.
- **Phase 3:** status and remove are filesystem read/write operations over a known directory structure. Standard patterns; no novel integration challenges.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against npm registry engines fields; version constraints (Node 18.19.0 minimum from execa, Node 20+ for v-next of each dep) confirmed against official changelogs |
| Features | HIGH | Competitive analysis cross-referenced against official docs for husky, lefthook, pre-push; feature gaps confirmed accurate; git hook behavior verified against git-scm.com official docs |
| Architecture | HIGH | Architecture patterns sourced from lint-staged DeepWiki (authoritative), husky repo, and Commander.js guides; component boundaries and data flow are standard patterns for Node.js CLI tools |
| Pitfalls | HIGH | Each critical pitfall sourced from confirmed GitHub issues with reproduction reports (husky#850, husky#1129, Inquirer.js#518, npm/cli#2329); not inferred from documentation alone |

**Overall confidence:** HIGH

### Gaps to Address

- **Windows support scope:** The `exec < /dev/tty` stdin fix in the hook template does not work on Windows Git Bash where `/dev/tty` may not exist. This project has not declared a Windows compatibility stance. Decide during Phase 2 planning: either guard the shell redirect with a TTY check (`[ -t 1 ] && exec < /dev/tty`) or explicitly document Windows as unsupported.
- **Husky dependency decision:** Research identified two valid hook installation approaches: (A) delegate to husky as a dependency in the target project, or (B) write hook files directly using `git config core.hooksPath`. Approach B reduces footprint but requires more code in pusherg. Approach A trades a dependency for simplicity. This decision affects the init command design and should be made at the start of Phase 2.
- **Push ref data use:** The git pre-push hook sends push ref metadata (branches and SHAs being pushed) on stdin. PITFALLS.md documents the conflict with TTY prompts. The MVP decision is to ignore this data — but this should be explicitly documented in code so it is not later treated as a bug.
- **Timeout default:** PITFALLS.md calls out process hang on long test suites as a "never acceptable" shortcut. A default timeout (suggested: 5 minutes) and a `PUSHERG_TIMEOUT` env var escape hatch should be designed into runner.js from the start, not retrofitted.

## Sources

### Primary (HIGH confidence)
- npm registry (live) — commander, chalk, ora, execa, @inquirer/prompts, husky, vitest engines fields
- https://github.com/tj/commander.js/blob/master/CHANGELOG.md — v13/v14 Node.js version requirements
- https://github.com/sindresorhus/ora/releases — v8/v9 Node.js split
- https://typicode.github.io/husky/ — husky v9 installation API, troubleshooting, CI patterns
- https://git-scm.com/docs/githooks — pre-push stdin spec, exit code contract, --no-verify behavior
- https://nodejs.org/api/tty.html — process.stdin.isTTY behavior documentation
- https://deepwiki.com/lint-staged/lint-staged/2-core-architecture — lint-staged architecture reference
- https://github.com/typicode/husky/issues/850 — TTY problem in hooks (confirmed issue)
- https://github.com/typicode/husky/issues/1129 — inquirer in hooks (confirmed issue)
- https://github.com/SBoudrias/Inquirer.js/issues/518 — root cause and /dev/tty workaround
- https://github.com/npm/cli/issues/2329 — stale npx cache (confirmed issue)
- https://medium.com/@ehmicky/execa-9-release-d0d5daaa097f — execa v9 Node.js minimum requirements

### Secondary (MEDIUM confidence)
- https://www.pkgpulse.com/blog/husky-vs-lefthook-vs-lint-staged-git-hooks-nodejs-2026 — competitive feature comparison (cross-referenced against official docs)
- https://betterstack.com/community/guides/scaling-nodejs/commander-explained/ — commander.js patterns
- https://www.javacodegeeks.com/2025/03/building-cli-tools-with-node-js.html — Node.js CLI architecture patterns
- https://devtoolbox.dedyn.io/blog/git-hooks-complete-guide — git core.hooksPath pattern

### Tertiary (LOW confidence)
- WebSearch: git hook bypass patterns 2024-2025 — --no-verify, HUSKY=0 patterns (verified against git-scm official docs)

---
*Research completed: 2026-04-03*
*Ready for roadmap: yes*
