# Roadmap: pusherg

## Overview

pusherg ships in four phases ordered by dependency: service modules first (no dependencies, independently testable), then the init and run commands that consume them (the actual product), then the management commands that read the hook format established in phase 2, then UX polish and publish prep. The stdin/TTY pitfall in git hooks is the single highest-risk item and must be resolved in Phase 2 before Phase 3 begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffolding and pure service modules (detect, runner, reporter, prompt)
- [ ] **Phase 2: Core** - init command, hook installation, run command with TTY-safe interactive prompt
- [ ] **Phase 3: Management** - status and remove commands
- [ ] **Phase 4: Polish** - Spinners, error UX, README, npm publish prep

## Phase Details

### Phase 1: Foundation
**Goal**: A tested, importable service layer exists — project scaffolding is complete and all service modules are independently callable
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-02, SETUP-03, DETECT-01, DETECT-02
**Success Criteria** (what must be TRUE):
  1. `detect.js` reads package.json and returns build/test/lint scripts present in the file, silently skipping scripts that are absent
  2. `detect.js` identifies the package manager (npm/yarn/pnpm) from lockfile presence with no configuration
  3. `runner.js` executes a shell command via execa and returns a result object with exit code, stdout/stderr, and elapsed time in milliseconds
  4. `reporter.js` accepts a results array and prints colored pass/fail lines to stderr (not stdout) for each script
  5. `prompt.js` returns a boolean answer from an @inquirer/prompts confirm prompt, and returns false (abort) when not in a TTY environment
**Plans:** 2 plans
Plans:
- [ ] 01-01-PLAN.md — Scaffold project and build detect.js service module
- [ ] 01-02-PLAN.md — Build runner.js, reporter.js, and prompt.js service modules

### Phase 2: Core
**Goal**: Users can run `npx pusherg init` to install a working pre-push hook, and pushing triggers checks with colored output and an interactive prompt on failure
**Depends on**: Phase 1
**Requirements**: SETUP-01, DETECT-03, DETECT-04, OUTPUT-01, OUTPUT-02, OUTPUT-04, OUTPUT-05, LIFECYCLE-03
**Success Criteria** (what must be TRUE):
  1. Running `npx pusherg init` in a git repo installs a pre-push hook file at `.git/hooks/pre-push` with executable permissions (mode 0o755)
  2. Running `git push` in a project with build/test scripts executes all detected scripts and shows colored pass/fail output with timing for each one
  3. When any script fails, the push is aborted by default and an interactive "Push anyway?" prompt appears — answering yes lets the push through
  4. Running `git push` in a non-TTY or CI environment auto-aborts with a clear message instead of hanging
  5. Passing `--force` to `pusherg run` (via the hook) skips all checks and exits 0 immediately
  6. All scripts run even if one fails (no fail-fast) — the full results summary is shown before the prompt
**Plans**: TBD

### Phase 3: Management
**Goal**: Users can inspect their hook configuration and cleanly remove it
**Depends on**: Phase 2
**Requirements**: LIFECYCLE-01, LIFECYCLE-02
**Success Criteria** (what must be TRUE):
  1. Running `pusherg status` shows which scripts will run on push and confirms the hook file is installed and executable
  2. Running `pusherg remove` deletes the pre-push hook file and reports success — subsequent git pushes go through without running checks
**Plans**: TBD

### Phase 4: Polish
**Goal**: The tool is ready for public release — UX is polished, error output is clean, and the package is publish-ready
**Depends on**: Phase 3
**Requirements**: OUTPUT-03
**Success Criteria** (what must be TRUE):
  1. Ora spinners appear while each script is running — the spinner shows the script name and resolves to a pass/fail icon on completion
  2. Error conditions (no git repo, no package.json, hook already installed) produce clear one-line messages with no raw stack traces visible to the user
  3. README documents the canonical `npx pusherg@latest init` invocation, CI behavior, `--force` usage, and Windows limitations
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Planning complete | - |
| 2. Core | 0/? | Not started | - |
| 3. Management | 0/? | Not started | - |
| 4. Polish | 0/? | Not started | - |
