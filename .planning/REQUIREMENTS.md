# Requirements — Milestone v1.0 MVP

## Setup & Installation

- [ ] **SETUP-01**: User can run `npx pusherg init` to install a pre-push git hook into their project
- [ ] **SETUP-02**: pusherg detects the package manager (npm/yarn/pnpm) from lockfile presence
- [ ] **SETUP-03**: Init command works without any configuration files or manual setup

## Detection & Execution

- [ ] **DETECT-01**: pusherg auto-detects build, test, and lint scripts from package.json
- [ ] **DETECT-02**: pusherg silently skips scripts that don't exist in package.json
- [ ] **DETECT-03**: Pre-push hook runs all detected scripts before allowing git push
- [ ] **DETECT-04**: pusherg runs all scripts and reports all failures (not fail-fast)

## Output & Feedback

- [ ] **OUTPUT-01**: pusherg shows colored pass/fail output for each script
- [ ] **OUTPUT-02**: pusherg displays execution time for each script
- [ ] **OUTPUT-03**: pusherg shows ora spinner during script execution
- [ ] **OUTPUT-04**: pusherg presents interactive "Push anyway?" prompt when any script fails
- [ ] **OUTPUT-05**: pusherg auto-aborts in non-TTY/CI environments (no hanging)

## Lifecycle Management

- [ ] **LIFECYCLE-01**: User can run `pusherg remove` to cleanly uninstall the hook
- [ ] **LIFECYCLE-02**: User can run `pusherg status` to see current hook configuration
- [ ] **LIFECYCLE-03**: User can pass `--force` flag to skip all checks and push immediately

## Future Requirements

(None deferred — all features selected for v1.0)

## Out of Scope

- Pre-commit hooks — deferred to post-MVP
- Monorepo support — deferred to post-MVP
- Custom config files (.pushergrc) — deferred to post-MVP
- CI-awareness auto-detection — deferred to post-MVP
- Watch mode for local dev — deferred to post-MVP
- TypeScript project detection — deferred to post-MVP
- Windows Git Bash support — needs research, deferred to post-MVP
- Bun package manager support — deferred to post-MVP

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SETUP-01 | — | Pending |
| SETUP-02 | — | Pending |
| SETUP-03 | — | Pending |
| DETECT-01 | — | Pending |
| DETECT-02 | — | Pending |
| DETECT-03 | — | Pending |
| DETECT-04 | — | Pending |
| OUTPUT-01 | — | Pending |
| OUTPUT-02 | — | Pending |
| OUTPUT-03 | — | Pending |
| OUTPUT-04 | — | Pending |
| OUTPUT-05 | — | Pending |
| LIFECYCLE-01 | — | Pending |
| LIFECYCLE-02 | — | Pending |
| LIFECYCLE-03 | — | Pending |
