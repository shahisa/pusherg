# External Integrations

**Analysis Date:** 2026-04-03

## APIs & External Services

**npm Registry:**
- npm public registry - Package distribution and installation
  - SDK/Client: Built-in npm/npx
  - Auth: npm token (for publishing only, manual by maintainer)
  - Usage: `npx pusherg` invocation, dependency installation

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem only
  - Hook templates: `templates/pre-push` (bundled with package)
  - Generated hooks: `.husky/pre-push` (written to target project)
  - Configuration: Target project's `package.json` (read-only)

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None
  - Implementation: No user authentication required
  - Git credentials handled by user's git configuration (not managed by pusherg)

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Console output only (stdout/stderr)
- No persistent logging
- Terminal formatting via chalk (colored output)
- Progress indicators via ora (spinners)

## CI/CD & Deployment

**Hosting:**
- npm registry (package distribution)

**CI Pipeline:**
- None configured yet
  - Planned: Manual testing before `npm publish`
  - Post-MVP: GitHub Actions for automated testing

## Environment Configuration

**Required env vars:**
- None for pusherg CLI itself

**Secrets location:**
- npm publish token (maintainer only, not stored in repo)
- No secrets required for end users

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Git Integration

**Husky:**
- Git hooks framework - Core integration for pre-push functionality
  - Installation: `npx husky init` or `npx husky install` (executed in target projects)
  - Hook location: `.husky/pre-push` (written by pusherg init command)
  - Detection: Checks for existing `.git/` directory before installation
  - Template: Custom pre-push script that calls `npx pusherg run pre-push`

**Target Project Detection:**
- package.json parsing - Auto-detects build/test/lint scripts
  - Scripts detected: `build`, `compile`, `tsc`, `test`, `test:unit`, `vitest`, `jest`, `lint`, `eslint`, `lint:check`
  - Lockfile detection: `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json` (determines package manager)
  - Skips: Default npm placeholder scripts (e.g., `echo "Error: no test specified"`)

## Process Execution

**Child Processes:**
- execa - Process spawning for running detected commands
  - Executes: `npm run build`, `npm test`, `npm run lint` (or yarn/pnpm equivalents)
  - Captures: stdout, stderr, exit codes
  - Timeout handling: Planned for post-MVP

---

*Integration audit: 2026-04-03*
