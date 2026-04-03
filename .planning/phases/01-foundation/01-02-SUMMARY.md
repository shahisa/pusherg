---
phase: 01-foundation
plan: 02
subsystem: testing
tags: [execa, chalk, inquirer, vitest, runner, reporter, prompt, cli]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: detect.js with detectScripts — the service layer sibling this plan completes

provides:
  - runner.js with runScript — executes shell commands via execa, returns structured result objects
  - reporter.js with printResult/printSummary — colored pass/fail output exclusively to stderr
  - prompt.js with askPushAnyway — TTY-aware confirm wrapper, safe in CI environments

affects:
  - Phase 02 commands (init, run, status, remove) — compose all three service modules
  - bin/cli.js entry point
  - pre-push hook execution flow

# Tech tracking
tech-stack:
  added: [execa v9, chalk v5, @inquirer/prompts]
  patterns:
    - All service functions accept explicit cwd parameter for test isolation
    - All terminal output exclusively via process.stderr.write (never stdout)
    - TTY guard before any interactive prompt call
    - vi.mock hoisted at module level for @inquirer/prompts mocking pattern

key-files:
  created:
    - src/runner.js
    - src/reporter.js
    - src/prompt.js
    - test/runner.test.js
    - test/reporter.test.js
    - test/prompt.test.js
  modified: []

key-decisions:
  - "vi.mock must be declared at module level (hoisted) not inside test body — avoids ReferenceError with variable factory closures"
  - "reporter uses process.stderr.write directly (not console.error) for precise control — git hooks can suppress stderr in some environments"
  - "prompt returns false (not throw) in non-TTY — CI-safe abort behavior by default"

patterns-established:
  - "Service modules are pure functions with no internal cross-dependencies"
  - "TDD: write failing test, confirm RED, write implementation, confirm GREEN"
  - "All output to stderr — never stdout — established for entire CLI layer"

requirements-completed: [SETUP-03]

# Metrics
duration: 6min
completed: 2026-04-03
---

# Phase 01 Plan 02: Service Layer (runner, reporter, prompt) Summary

**Three service modules with 16 passing unit tests: runScript via execa with reject:false, chalk-colored stderr reporter, TTY-guarded inquirer prompt wrapper**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-03T14:49:43Z
- **Completed:** 2026-04-03T14:55:28Z
- **Tasks:** 3
- **Files modified:** 6 created

## Accomplishments
- runner.js executes npm scripts via execa, returns {name, passed, exitCode, stdout, stderr, duration}, never throws on non-zero exit
- reporter.js writes colored pass/fail indicators and summary exclusively to process.stderr (chalk green/red)
- prompt.js guards against non-TTY environments before calling confirm, defaults to false (abort) to protect CI pipelines

## Task Commits

Each task was committed atomically:

1. **Task 1: runner.js — script execution via execa** - `c11fea0` (feat)
2. **Task 2: reporter.js — colored pass/fail output to stderr** - `b852656` (feat)
3. **Task 3: prompt.js — TTY-aware confirm wrapper** - `f6d1f9f` (feat)

_Note: TDD tasks followed RED → GREEN flow. All tests passing before commit._

## Files Created/Modified
- `src/runner.js` - Executes shell commands via execa; returns structured result object
- `src/reporter.js` - Prints colored pass/fail lines and summary to stderr
- `src/prompt.js` - TTY-aware confirm prompt; returns false in non-TTY environments
- `test/runner.test.js` - 6 unit tests covering pass/fail/stdout/stderr/duration/shape
- `test/reporter.test.js` - 6 unit tests verifying stderr-only output and content
- `test/prompt.test.js` - 4 unit tests covering TTY guard and confirm call behavior

## Decisions Made
- Used `vi.mock` at module level (hoisted) for @inquirer/prompts — the factory pattern with local variables causes ReferenceError when vi.mock is placed inside test body
- reporter uses `process.stderr.write` not `console.error` — more precise, no automatic newline injection
- prompt returns `false` on non-TTY rather than throwing — callers can treat this as "user said no" cleanly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock hoisting issue in prompt test**
- **Found during:** Task 3 (prompt.js — GREEN phase)
- **Issue:** `vi.mock('@inquirer/prompts', () => ({ confirm: confirmMock }))` inside test body caused `ReferenceError: confirmMock is not defined` because vi.mock is hoisted to top of file but the `confirmMock` variable closure is not
- **Fix:** Moved to module-level `vi.mock` with `vi.fn()` factory; used `vi.mocked(confirm)` inside tests to configure per-test behavior
- **Files modified:** test/prompt.test.js
- **Verification:** `npx vitest run test/prompt.test.js` passes all 4 tests
- **Committed in:** f6d1f9f (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test setup)
**Impact on plan:** Fix was necessary for test correctness. No scope creep.

## Issues Encountered
- vitest not installed initially (node_modules missing) — resolved with `npm install` before first test run

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four service modules complete (detect, runner, reporter, prompt)
- `npx vitest run` passes all 43 tests across all service modules
- Phase 02 commands (init, run, status, remove) can now import and compose these modules
- Reminder from STATE.md: stdin/TTY conflict inside git hooks is the highest Phase 2 risk — must be integration-tested with actual `git push` against a real repo

---
*Phase: 01-foundation*
*Completed: 2026-04-03*

## Self-Check: PASSED

- src/runner.js — FOUND
- src/reporter.js — FOUND
- src/prompt.js — FOUND
- test/runner.test.js — FOUND
- test/reporter.test.js — FOUND
- test/prompt.test.js — FOUND
- .planning/phases/01-foundation/01-02-SUMMARY.md — FOUND
- Commit c11fea0 — FOUND
- Commit b852656 — FOUND
- Commit f6d1f9f — FOUND
