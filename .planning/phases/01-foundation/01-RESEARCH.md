# Phase 1: Foundation - Research

**Researched:** 2026-04-03
**Domain:** Node.js ESM CLI service modules (detect, runner, reporter, prompt) + project scaffolding
**Confidence:** HIGH

---

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md are mandatory. The planner must verify every task complies with these.

| Directive | Category |
|-----------|----------|
| Node.js >= 18, ESM (`"type": "module"`) | Tech stack |
| CLI: commander | Tech stack |
| Terminal UI: chalk, ora, inquirer | Tech stack |
| Process: execa | Tech stack |
| Testing: vitest | Tech stack |
| Commit with a descriptive message after completing each task | Workflow |
| Build one task/module at a time | Workflow |
| Run tests after building each module | Workflow |
| If something breaks, fix it before moving to the next task | Workflow |
| NEVER run `npm publish` | Safety |
| NEVER install global packages (no `-g` flag) | Safety |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-02 | pusherg detects the package manager (npm/yarn/pnpm) from lockfile presence | Lock file heuristic pattern: check yarn.lock, pnpm-lock.yaml, package-lock.json; default to npm |
| SETUP-03 | Init command works without any configuration files or manual setup | detect.js reads package.json only; no config file needed; zero-config by design |
| DETECT-01 | pusherg auto-detects build, test, and lint scripts from package.json | detect.js reads `scripts` field from package.json; filters to KNOWN_SCRIPTS list (build, test, lint, typecheck) |
| DETECT-02 | pusherg silently skips scripts that don't exist in package.json | detectScripts returns intersection of KNOWN_SCRIPTS with available scripts; absent = not in output |
</phase_requirements>

---

## Summary

Phase 1 builds the service layer — four pure modules (`detect.js`, `runner.js`, `reporter.js`, `prompt.js`) plus project scaffolding (package.json, directory structure, vitest configuration). These modules have no internal dependencies on each other and no dependency on the git hook or CLI entry point. They are entirely unit-testable in isolation.

The architecture research makes the pattern explicit: services are pure functions that take inputs and return outputs with no side effects or global state. This is the same pattern used by lint-staged (pure `ctx` pipeline) and husky (pure service utilities invoked from command modules). Each service module for Phase 1 maps directly to one or two requirements: `detect.js` covers SETUP-02, DETECT-01, DETECT-02; `runner.js` covers SETUP-03 (dependency-free execution); `reporter.js` and `prompt.js` are the building blocks that Phase 2 commands depend on.

The stack is fully settled from project-level research. All libraries are ESM-only and have version pins constrained by Node 18 compatibility. The critical version constraint is execa v9 requiring Node >=18.19.0 — the package.json engines field must declare this minimum, not just `>=18.0.0`. Vitest v3 (not v4), ora v8 (not v9), commander v13 (not v14), and @inquirer/prompts v7 (not v8) are the correct pins; all v-next majors require Node 20+. This was verified against the npm registry as of 2026-04-03.

**Primary recommendation:** Scaffold package.json and vitest config first so tests can run from task 1. Then build and test service modules in dependency order: detect.js, runner.js, reporter.js, prompt.js.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | >=18.19.0 | Runtime | LTS baseline; execa v9 requires exactly 18.19.0+, not just 18.x |
| ESM (`"type":"module"`) | — | Module system | All chosen deps are ESM-only in their current major; mixing CJS requires dual builds |
| chalk | ^5.4.1 | Terminal color output | ESM-only since v5, zero deps, actively maintained |
| execa | ^9.6.1 | Child process execution | Purpose-built for CLIs: structured errors, typed results; ESM-only |
| @inquirer/prompts | ^7.10.1 | Interactive prompts (Phase 1: TTY check wrapper) | v7 is last Node 18 compatible series; v8 requires Node 20+ |
| vitest | ^3.2.4 | Testing | Native ESM, zero transform config needed; v3 is last Node 18 compatible series |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| commander | ^13.1.0 | CLI parsing | Scaffolded in package.json now; wired in Phase 2 (bin/cli.js) |
| ora | ^8.2.0 | Terminal spinners | Scaffolded as dependency now; actively used in Phase 4 polish |
| fs/promises | Node built-in | File reads (package.json, lockfiles) | Used by detect.js |
| path | Node built-in | Path construction for lockfile checks | Used by detect.js |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @inquirer/prompts ^7 | @clack/prompts | @clack is smaller with opinionated output; @inquirer/prompts is official inquirer successor with wider recognition |
| vitest ^3 | jest | Jest requires ESM transform config; vitest is native ESM — zero config for this project |
| execa ^9 | child_process (built-in) | child_process requires manual error handling, no structured results; execa wraps these correctly |

**Installation:**
```bash
npm install commander@^13.1.0 chalk@^5.4.1 ora@^8.2.0 execa@^9.6.1 @inquirer/prompts@^7.10.1
npm install -D vitest@^3.2.4
```

**Version verification (confirmed against npm registry 2026-04-03):**

| Package | Recommended Pin | Latest at Registry | Node 18 Compatible |
|---------|-----------------|-------------------|-------------------|
| chalk | ^5.4.1 | 5.6.2 | Yes |
| execa | ^9.6.1 | 9.6.1 | Yes (requires 18.19.0+) |
| @inquirer/prompts | ^7.10.1 | 8.3.2 (v8 = Node 20+) | v7 series: yes |
| vitest | ^3.2.4 | 4.1.2 (v4 = Node 20+) | v3 series: yes |
| ora | ^8.2.0 | 9.3.0 (v9 = Node 20+) | v8 series: yes |
| commander | ^13.1.0 | 14.0.3 (v14 = Node 20+) | v13 series: yes |

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

Phase 1 creates these files (Phase 2+ adds the rest):

```
pusherg/
├── bin/
│   └── cli.js              # Stub file only — wired in Phase 2
├── src/
│   ├── detect.js           # BUILT Phase 1 — reads package.json, detects scripts + pkg manager
│   ├── runner.js           # BUILT Phase 1 — executes scripts via execa, returns result objects
│   ├── reporter.js         # BUILT Phase 1 — formats and prints pass/fail lines to stderr
│   ├── prompt.js           # BUILT Phase 1 — TTY-aware confirm wrapper over @inquirer/prompts
│   └── commands/           # Empty dir scaffolded; command files added in Phase 2
├── templates/
│   └── pre-push            # Added in Phase 2
├── test/
│   ├── detect.test.js      # BUILT Phase 1
│   ├── runner.test.js      # BUILT Phase 1
│   ├── reporter.test.js    # BUILT Phase 1
│   └── prompt.test.js      # BUILT Phase 1
├── package.json            # BUILT Phase 1 — includes engines, exports, bin, scripts, all deps
├── vitest.config.js        # BUILT Phase 1
├── README.md               # Placeholder in Phase 1
└── LICENSE                 # MIT
```

### Pattern 1: Pure Service Functions

**What:** Each service module exports named async functions that accept explicit inputs and return explicit outputs. No module-level state, no process.exit(), no printing (except reporter which only writes to stderr).

**When to use:** Always — for all four service modules.

**Example:**
```javascript
// src/detect.js — accepts cwd, returns data, no side effects
export async function detectScripts(cwd) { ... }
export async function detectPackageManager(cwd) { ... }
```

### Pattern 2: Runner Returns Structured Result Objects

**What:** `runner.js` executes one script at a time via execa with `reject: false` and returns a structured result object per script. Never runs multiple scripts with shell string concatenation.

**When to use:** For every script execution. The result shape is the contract between runner, reporter, and prompt.

**Result shape:**
```javascript
{
  name: 'build',         // script name
  passed: true,          // exitCode === 0
  exitCode: 0,           // raw exit code
  stdout: '...',         // captured stdout
  stderr: '...',         // captured stderr
  duration: 4231,        // elapsed ms (Date.now() delta)
}
```

### Pattern 3: Reporter Writes to stderr (NOT stdout)

**What:** `reporter.js` uses `process.stderr.write()` for ALL output. Never `console.log()` or `process.stdout`.

**Why:** Git hooks suppress stdout in some environments. stderr is always shown. This is a locked project constraint in STATE.md.

**When to use:** Every `process.stderr.write()` call in reporter.js — no exceptions.

### Pattern 4: TTY-Aware Prompt Wrapper

**What:** `prompt.js` checks `process.stdin.isTTY` before calling the @inquirer/prompts confirm function. If not a TTY (CI, git hook without `/dev/tty` redirect), it returns `false` immediately without attempting to read stdin.

**Why:** Inside git hooks, `process.stdin.isTTY` is always falsy because git passes push ref data on stdin. The Node-side TTY check is a defensive fallback (the hook template `exec < /dev/tty` fix comes in Phase 2).

### Pattern 5: Lock File Detection Order

**What:** `detectPackageManager` checks for lock files in this priority order: yarn.lock (yarn), pnpm-lock.yaml (pnpm), falls back to npm. Covers SETUP-02.

**Why:** Lock files are the universal heuristic used by create-react-app, Vite, and most scaffolding tools. `package-lock.json` doesn't need an explicit check because npm is the fallback default.

### Pattern 6: Package.json Scaffolding Constraints

**What:** Phase 1 creates the canonical `package.json` with the correct `"type": "module"`, `engines`, `bin`, and `scripts` fields. Getting these right now avoids breaking changes later.

**Critical fields:**
```json
{
  "name": "pusherg",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=18.19.0" },
  "bin": { "pusherg": "./bin/cli.js" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch"
  }
}
```

**Critical:** `"node": ">=18.19.0"` not `">=18.0.0"`. Execa v9 breaks on Node 18.0.0–18.18.x.

### Anti-Patterns to Avoid

- **Logic in bin/cli.js:** bin/cli.js should only wire commander. All logic in src/. Untestable otherwise.
- **Global state in service modules:** detect.js re-reads package.json on every call. No module-level caching. Pusherg is invoked fresh per push.
- **Shell string concatenation for scripts:** Each script is a separate execa call. No `npm run build && npm run test` concatenated string.
- **Silent error catching:** Distinguish script failure (expected) from pusherg internal error (unexpected). Never swallow errors.
- **stdout for reporter output:** All reporter output goes to stderr. Git hooks suppress stdout.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subprocess execution with exit codes | Custom child_process wrapper | execa | Handles error objects, structured results, streaming; custom wrappers miss edge cases |
| TTY-aware prompts | Raw readline or custom TTY check loop | @inquirer/prompts + isTTY guard | prompt libraries handle terminal raw mode, cursor positioning, keystroke handling |
| Terminal colors | ANSI escape code strings | chalk | chalk handles NO_COLOR, CI detection, 256-color vs 16-color terminal capability |
| Test runner for ESM | Jest with transform config | vitest | Native ESM — zero configuration needed |

**Key insight:** The four service modules are thin wrappers around these standard libraries. Never reimplement what the library already does correctly.

---

## Common Pitfalls

### Pitfall 1: Wrong Node.js Minimum in engines Field

**What goes wrong:** Declaring `"node": ">=18.0.0"` installs and starts fine, but execa v9 crashes at import time on Node 18.0.0–18.18.x.

**Why it happens:** execa v9's package.json declares `"node": "^18.19.0 || >=20.5.0"`. npm does not block the install, but the import fails at runtime.

**How to avoid:** Declare `"node": ">=18.19.0"` in package.json engines field.

**Warning signs:** `Error: The current Node.js version X is not supported` at startup on Node 18.x.

---

### Pitfall 2: reporter.js Writes to stdout

**What goes wrong:** `console.log()` or `process.stdout.write()` in reporter.js — output disappears when git runs the hook because git swallows hook stdout in some environments.

**Why it happens:** Developers default to console.log() without thinking about git hook output routing.

**How to avoid:** Use `process.stderr.write()` or `console.error()` throughout reporter.js. This is a locked constraint from STATE.md.

**Warning signs:** Hook runs silently with no visible output in the terminal.

---

### Pitfall 3: detect.js Uses process.cwd() Internally

**What goes wrong:** `detect.js` calls `process.cwd()` inside its functions instead of accepting `cwd` as a parameter. Makes it impossible to unit test with a fixture directory.

**Why it happens:** Feels convenient; works at runtime but breaks test isolation.

**How to avoid:** All service functions accept `cwd` as an explicit parameter. Tests pass a tmp directory with a written package.json fixture.

**Warning signs:** Tests require `process.chdir()` or cannot test different project structures in the same test run.

---

### Pitfall 4: Losing Exit Code by Catching ExecaError

**What goes wrong:** Wrapping the execa call in try/catch without `reject: false` means all non-zero exits throw. Catching the error and re-mapping loses the structured exit code and output.

**Why it happens:** Default execa behavior throws on non-zero exit. Developers catch the error but discard the ExecaError object's `exitCode`, `stdout`, and `stderr` fields.

**How to avoid:** Use `reject: false` option so execa always resolves. The result object always contains `exitCode`, `stdout`, `stderr`.

**Warning signs:** All script failures return exitCode -1 regardless of actual exit code; stdout/stderr are empty strings.

---

### Pitfall 5: Not Testing the Non-TTY Branch in prompt.js

**What goes wrong:** prompt.js only tested in interactive terminal. In CI or inside a git hook without TTY redirect, `process.stdin.isTTY` is undefined/falsy and the prompt hangs or throws.

**Why it happens:** Tests run in a TTY context locally; the non-TTY branch is never exercised.

**How to avoid:** Unit test the non-TTY branch by temporarily setting `process.stdin.isTTY = undefined` before calling `askPushAnyway()`. Verify it returns `false` without calling the @inquirer/prompts confirm function.

**Warning signs:** Tests pass locally; CI hangs indefinitely waiting for stdin.

---

## Code Examples

Verified patterns sourced from project-level architecture research (ARCHITECTURE.md).

### detect.js — Script Detection and Package Manager
```javascript
// src/detect.js
import { readFile } from 'fs/promises'
import { join } from 'path'

const KNOWN_SCRIPTS = ['build', 'test', 'lint', 'typecheck', 'type-check']

export async function detectScripts(cwd) {
  const raw = await readFile(join(cwd, 'package.json'), 'utf8')
  const pkg = JSON.parse(raw)
  const available = Object.keys(pkg.scripts || {})
  // Intersection: only scripts that exist in this package.json (DETECT-01 + DETECT-02)
  return KNOWN_SCRIPTS.filter(name => available.includes(name))
}

export async function detectPackageManager(cwd) {
  // SETUP-02: lockfile heuristic
  for (const [file, manager] of [['yarn.lock', 'yarn'], ['pnpm-lock.yaml', 'pnpm']]) {
    try {
      await readFile(join(cwd, file))
      return manager
    } catch {
      // file absent — try next
    }
  }
  return 'npm'  // default
}
```

### runner.js — Script Execution via execa
```javascript
// src/runner.js
import { execa } from 'execa'

export async function runScript(packageManager, scriptName, { cwd } = {}) {
  const start = Date.now()
  const proc = await execa(packageManager, ['run', scriptName], {
    reject: false,   // always resolve; capture exit code regardless of pass/fail
    cwd,
    all: true,
  })
  return {
    name: scriptName,
    passed: proc.exitCode === 0,
    exitCode: proc.exitCode,
    stdout: proc.stdout ?? '',
    stderr: proc.stderr ?? '',
    duration: Date.now() - start,
  }
}
```

### reporter.js — Colored Output to stderr
```javascript
// src/reporter.js
import chalk from 'chalk'

export function printResult(result) {
  const icon = result.passed ? chalk.green('✓') : chalk.red('✗')
  // NOTE: stderr only — git hooks suppress stdout
  process.stderr.write(`  ${icon} ${result.name} (${result.duration}ms)\n`)
}

export function printSummary(results) {
  const failed = results.filter(r => !r.passed)
  if (failed.length === 0) {
    process.stderr.write(chalk.green('\nAll checks passed.\n'))
  } else {
    process.stderr.write(chalk.red(`\n${failed.length} check(s) failed.\n`))
  }
}
```

### prompt.js — TTY-Aware Confirm
```javascript
// src/prompt.js
import { confirm } from '@inquirer/prompts'

export async function askPushAnyway() {
  // Non-TTY guard: returns false (abort) in CI and git hooks without /dev/tty redirect
  if (!process.stdin.isTTY) {
    return false
  }
  return confirm({ message: 'Push anyway?', default: false })
}
```

### vitest.config.js — Zero Config for ESM
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

### detect.test.js — Testing with Temp Directory Fixtures
```javascript
// test/detect.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtemp, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectScripts, detectPackageManager } from '../src/detect.js'

describe('detectScripts', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
  })

  it('returns only scripts that exist in package.json', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { build: 'tsc', test: 'vitest' } })
    )
    const scripts = await detectScripts(tmpDir)
    expect(scripts).toEqual(['build', 'test'])
  })

  it('silently skips scripts absent from package.json (DETECT-02)', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { build: 'tsc' } })
    )
    const scripts = await detectScripts(tmpDir)
    expect(scripts).not.toContain('test')
    expect(scripts).not.toContain('lint')
  })
})

describe('detectPackageManager', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-pm-test-'))
  })

  it('returns yarn when yarn.lock present (SETUP-02)', async () => {
    await writeFile(join(tmpDir, 'yarn.lock'), '')
    expect(await detectPackageManager(tmpDir)).toBe('yarn')
  })

  it('returns pnpm when pnpm-lock.yaml present (SETUP-02)', async () => {
    await writeFile(join(tmpDir, 'pnpm-lock.yaml'), '')
    expect(await detectPackageManager(tmpDir)).toBe('pnpm')
  })

  it('defaults to npm when no lockfile found (SETUP-02)', async () => {
    expect(await detectPackageManager(tmpDir)).toBe('npm')
  })
})
```

### prompt.test.js — Testing Non-TTY Branch
```javascript
// test/prompt.test.js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { askPushAnyway } from '../src/prompt.js'

describe('askPushAnyway', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false without prompting when not a TTY', async () => {
    // Simulate non-TTY environment (CI, git hook without /dev/tty redirect)
    Object.defineProperty(process.stdin, 'isTTY', { value: undefined, configurable: true })
    const result = await askPushAnyway()
    expect(result).toBe(false)
  })
})
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v24.10.0 | — |
| npm | Package management | Yes | 11.6.0 | — |
| git | Repository (already initialized) | Yes | (repo exists) | — |

**Notes:**
- Node.js is at v24.10.0 on this machine (well above >=18.19.0 requirement — no issues)
- No missing dependencies; Phase 1 is purely code + npm installs

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `inquirer` (legacy) | `@inquirer/prompts` | v9+ of inquirer monorepo | Legacy inquirer is maintenance-only; new projects use @inquirer/prompts |
| `child_process.exec` strings | `execa` with array args | Community consensus ~2018+ | Structured results, no shell injection, better error objects |
| Jest + Babel for ESM | vitest | 2022+ | Zero config for ESM; jest requires transform configuration |
| `>=18.0.0` Node minimum | `>=18.19.0` | execa v9 release (2024) | Node 18.0–18.18 users would hit import error otherwise |

**Deprecated/outdated:**
- `inquirer` (not `@inquirer/prompts`): marked "maintenance only" by the Inquirer.js team; no active feature development
- `chalk@^4`: CJS-era version; v5 is ESM and actively maintained — no reason to use v4 in an ESM project
- `jest` for Node.js ESM: requires `--experimental-vm-modules` or Babel transform; vitest is the standard for ESM projects

---

## Open Questions

1. **KNOWN_SCRIPTS filter list — which script names to include**
   - What we know: The requirements say "build, test, and lint scripts" but project overview and architecture mention `typecheck` as well
   - What's unclear: Whether `type-check` (hyphenated, used by some projects) should also be in the list
   - Recommendation: Include `['build', 'test', 'lint', 'typecheck', 'type-check']` in Phase 1. Trivial to add or remove before Phase 2 without breaking any consumers.

2. **bin/cli.js scaffolding depth in Phase 1**
   - What we know: bin/cli.js is wired in Phase 2 but the file needs to exist for `npm link` and testing to work
   - What's unclear: Whether Phase 1 should write a minimal stub or leave it empty
   - Recommendation: Write a minimal stub with a `#!/usr/bin/env node` shebang and a comment placeholder. Does not need to be functional in Phase 1.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — all library version pins verified against npm registry
- `.planning/research/ARCHITECTURE.md` — component boundaries, data shapes, build order
- `.planning/research/SUMMARY.md` — pitfalls sourced from confirmed GitHub issues (husky#850, Inquirer.js#518)
- npm registry (live, 2026-04-03) — confirmed current versions of all packages

### Secondary (MEDIUM confidence)
- https://deepwiki.com/lint-staged/lint-staged/2-core-architecture — pure service function pattern
- https://medium.com/@ehmicky/execa-9-release-d0d5daaa097f — execa v9 Node minimum requirement

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-04-03
- Architecture: HIGH — patterns sourced from lint-staged/husky official repos; standard Node.js CLI patterns
- Pitfalls: HIGH — each pitfall is a direct consequence of the requirement constraints or sourced from confirmed issues

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable libraries, 30-day window)
