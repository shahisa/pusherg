# Phase 2: Core — Research

**Researched:** 2026-04-03
**Domain:** Git hook installation, Commander.js CLI wiring, stdin/TTY inside git hooks, run command orchestration
**Confidence:** HIGH (core Node.js APIs and git hook behavior are stable; TTY findings cross-verified with multiple sources)

---

## Project Constraints (from CLAUDE.md)

- Node.js >= 18, ESM (`"type": "module"`)
- CLI: commander
- Terminal UI: chalk, ora, inquirer
- Process: execa
- Testing: vitest
- All user-facing output references "pusherg"
- NEVER run `npm publish`
- NEVER install global packages
- Commit after each completed task
- File structure: `bin/cli.js`, `src/commands/`, service modules already in `src/`

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | User can run `npx pusherg init` to install a pre-push git hook | Hook installation via `fs/promises` writeFile + chmod; git repo detection via `.git` dir check |
| DETECT-03 | Pre-push hook runs all detected scripts before allowing git push | Hook template calls `pusherg run`; `run` command calls `detectScripts` + iterates `runScript` |
| DETECT-04 | pusherg runs all scripts and reports all failures (not fail-fast) | `Promise.all` or sequential loop collecting all results before reporting; never short-circuit on fail |
| OUTPUT-01 | pusherg shows colored pass/fail output for each script | `reporter.printResult` already built — wire into `run` command |
| OUTPUT-02 | pusherg displays execution time for each script | `runner.runScript` already returns `duration` ms — `reporter.printResult` already renders it |
| OUTPUT-04 | pusherg presents interactive "Push anyway?" prompt when any script fails | `prompt.askPushAnyway` already built — called after all results collected; hook must `exec < /dev/tty` |
| OUTPUT-05 | pusherg auto-aborts in non-TTY/CI environments (no hanging) | `prompt.askPushAnyway` returns `false` when `!process.stdin.isTTY` — already implemented; hook must NOT override this |
| LIFECYCLE-03 | User can pass `--force` flag to skip all checks and push immediately | Commander option `--force` on `run` command; early-exit with code 0 before any detection |
</phase_requirements>

---

## Summary

Phase 2 wires the four Phase 1 service modules (`detect`, `runner`, `reporter`, `prompt`) into two real commands — `init` and `run` — plus a hook template that bridges `git push` to `pusherg run`.

The single highest-risk item is **stdin/TTY inside git hooks**. Git hands the hook piped stdin (the list of refs being pushed), which means `process.stdin.isTTY` is always `false` inside a hook. Without the `exec < /dev/tty` shell trick in the hook template, `askPushAnyway` will always return `false` — the push will always abort when any check fails, even interactively. The fix is one line in the hook template: `exec < /dev/tty` before calling `pusherg run`. This restores the terminal as stdin, allowing `@inquirer/prompts` to read keystrokes.

The `init` command is straightforward Node.js file system work: verify `.git` exists, construct the hook path, write the template, set mode `0o755`. The `run` command is the orchestrator: detect scripts, run all of them in sequence (no fail-fast), collect results, print each via reporter, print summary, then conditionally prompt or abort.

**Primary recommendation:** Use `exec < /dev/tty` as the first non-comment line of the pre-push hook template, guarded by a CI/non-TTY check so it does not fail in headless environments.

---

## Standard Stack

### Core (already installed — verified from package.json)

| Library | Version | Purpose | Role in Phase 2 |
|---------|---------|---------|-----------------|
| commander | 14.0.3 | CLI framework | Wire `init` and `run` commands in `bin/cli.js` |
| chalk | 5.6.2 | Terminal colors | Already used in reporter.js |
| @inquirer/prompts | 8.3.2 | Interactive confirm | Already used in prompt.js |
| execa | 9.6.1 | Process execution | Already used in runner.js |

### Node.js Built-ins Used in Phase 2

| Module | Purpose |
|--------|---------|
| `fs/promises` (`writeFile`, `chmod`, `access`) | Write hook file, set 0o755 permissions, check if `.git/hooks/` exists |
| `path` (`join`) | Construct hook path from cwd |
| `process` (`process.argv`, `process.exit`, `process.stdin.isTTY`) | Commander parse, exit codes, TTY guard |

### No New Dependencies Needed

Phase 2 introduces zero new npm packages. All required libraries were installed in Phase 1.

**Version verification:** Confirmed above against live npm registry via `npm view` — these are current as of 2026-04-03.

---

## Architecture Patterns

### Recommended Project Structure for Phase 2

```
src/
├── commands/
│   ├── init.js      # init command: validate git repo, write hook, chmod
│   └── run.js       # run command: detect, run all, report, prompt/abort
├── detect.js        # (existing) detectScripts, detectPackageManager
├── runner.js        # (existing) runScript
├── reporter.js      # (existing) printResult, printSummary
└── prompt.js        # (existing) askPushAnyway
bin/
└── cli.js           # Commander wiring: program.command('init'), program.command('run')
templates/
└── pre-push         # Shell hook template installed by init command
```

### Pattern 1: Commander async commands with parseAsync

Commander actions can be async; call `program.parseAsync(process.argv)` instead of `program.parse` so top-level awaits resolve correctly.

```javascript
// bin/cli.js
#!/usr/bin/env node
import { program } from 'commander'
import { initCommand } from '../src/commands/init.js'
import { runCommand } from '../src/commands/run.js'

program
  .name('pusherg')
  .version('0.1.0')

program
  .command('init')
  .description('Install pre-push hook in the current git repo')
  .action(initCommand)

program
  .command('run')
  .description('Run all pre-push checks (called by the hook)')
  .option('--force', 'Skip all checks and exit 0 immediately')
  .action(runCommand)

await program.parseAsync(process.argv)
```

### Pattern 2: init command — hook file installation

```javascript
// src/commands/init.js
import { writeFile, chmod, access } from 'fs/promises'
import { join } from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const TEMPLATE = readFileSync(join(__dirname, '../../templates/pre-push'), 'utf8')
const HOOK_PATH_FROM_CWD = '.git/hooks/pre-push'

export async function initCommand({ cwd = process.cwd() } = {}) {
  // 1. Verify this is a git repo
  const gitHooksDir = join(cwd, '.git', 'hooks')
  try {
    await access(join(cwd, '.git'))
  } catch {
    process.stderr.write('pusherg: not a git repository (no .git directory found)\n')
    process.exit(1)
  }

  // 2. Write the hook file
  const hookPath = join(cwd, HOOK_PATH_FROM_CWD)
  await writeFile(hookPath, TEMPLATE, 'utf8')
  await chmod(hookPath, 0o755)

  process.stderr.write('pusherg: pre-push hook installed successfully\n')
}
```

**Key point:** `cwd` must be an explicit parameter (established project pattern) — never call `process.cwd()` inside the module. The `cwd` default in the destructure is acceptable as a fallback only for the actual CLI path, not for tests.

### Pattern 3: pre-push hook template with TTY fix

This is the most critical piece of Phase 2. The template must:
1. Redirect stdin from `/dev/tty` so interactive prompts can receive keystrokes
2. Guard the redirect so non-TTY environments (CI, IDE) degrade gracefully instead of erroring

```bash
#!/bin/sh
# pusherg pre-push hook
# Runs build/test checks before every push.
# To skip: git push --no-verify

# Restore terminal stdin so interactive prompts work inside git hooks.
# In CI or non-TTY environments this silently does nothing.
if [ -t 1 ]; then
  exec < /dev/tty
fi

npx pusherg run
```

**Why `if [ -t 1 ]` (check if stdout is a terminal):** File descriptor 1 (stdout) being a TTY is a reliable proxy for "we are in an interactive shell session". In CI, stdout is piped/redirected, so the check fails silently and `exec < /dev/tty` is never reached. In an interactive terminal, it passes and stdin is restored.

**Alternative guard:** `if sh -c ": >/dev/tty" >/dev/null 2>/dev/null; then exec < /dev/tty; fi` — tests if `/dev/tty` is writable, which is also reliable. Either works; `[ -t 1 ]` is simpler.

**Why not `exec < /dev/tty` unconditionally:** In environments where `/dev/tty` doesn't exist (some CI containers, Docker without a tty), the unconditional form would fail with "can't open /dev/tty" and abort the push entirely with an unhelpful error.

**Source:** Verified in husky issues, Inquirer.js issue #518, and pre-push hook examples. The `exec < /dev/tty` technique is the canonical community-established solution for this exact problem.

### Pattern 4: run command — collect all, no fail-fast

```javascript
// src/commands/run.js
import { detectScripts, detectPackageManager } from '../detect.js'
import { runScript } from '../runner.js'
import { printResult, printSummary } from '../reporter.js'
import { askPushAnyway } from '../prompt.js'

export async function runCommand(options, { cwd = process.cwd() } = {}) {
  // --force: skip all checks
  if (options.force) {
    process.exit(0)
  }

  const pm = await detectPackageManager(cwd)
  const scripts = await detectScripts(cwd)

  if (scripts.length === 0) {
    process.stderr.write('pusherg: no scripts detected — push allowed\n')
    process.exit(0)
  }

  // Run ALL scripts — no fail-fast (DETECT-04)
  const results = []
  for (const script of scripts) {
    const result = await runScript(pm, script, { cwd })
    results.push(result)
    printResult(result)  // OUTPUT-01, OUTPUT-02
  }

  printSummary(results)

  const anyFailed = results.some(r => !r.passed)
  if (!anyFailed) {
    process.exit(0)
  }

  // OUTPUT-04: interactive prompt; OUTPUT-05: returns false in non-TTY
  const pushAnyway = await askPushAnyway()
  process.exit(pushAnyway ? 0 : 1)
}
```

**Sequential vs parallel for scripts:** Use sequential `for...of` loop rather than `Promise.all`. Reason: (a) test output is cleaner when scripts run in order, (b) it matches user mental model, (c) mixing stdout/stderr from parallel processes is harder to read. No meaningful performance difference for 2-4 scripts.

### Pattern 5: ESM __dirname equivalent

ESM modules don't have `__dirname`. Use this idiom to locate the templates directory relative to the source file:

```javascript
import { fileURLToPath } from 'url'
import { join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))
```

### Anti-Patterns to Avoid

- **`process.cwd()` inside modules:** All established project patterns pass `cwd` as an explicit parameter. The `run` command must accept `cwd` for test isolation.
- **`Promise.all` for script execution:** Parallel runs interleave stdout/stderr output, making test assertions fragile and terminal output confusing.
- **`console.log` or `console.error` for output:** Use `process.stderr.write` directly as established in Phase 1 — more precise control, no automatic newline injection.
- **Unconditional `exec < /dev/tty`:** Will fail with "can't open /dev/tty" in Docker containers and some CI environments, blocking all pushes.
- **`process.stdout.write` for user messages:** All output must go to stderr. Git hooks suppress stdout in some environments (established Phase 1 decision).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive confirm prompt | Custom stdin readline | `@inquirer/prompts confirm` (already installed) | Already handles TTY check, Enter key, default values |
| Script execution with exit code | `child_process.exec` | `execa` (already in runner.js) | reject:false, structured result, no throw on nonzero |
| Colored terminal output | ANSI escape codes | `chalk` (already in reporter.js) | Level detection, safe in non-color terminals |
| Hook file writing + chmod | Shell script | `fs/promises writeFile + chmod` | Two lines, no subprocess needed |

**Key insight:** Phase 2 is primarily wiring — the hard module work is done. Avoid reimplementing any service logic in the command layer.

---

## Common Pitfalls

### Pitfall 1: stdin consumed by git before hook reads it — interactive prompts auto-answer

**What goes wrong:** The pre-push hook receives ref information on stdin. The Node.js process launched by the hook inherits that piped stdin (not the terminal). `process.stdin.isTTY` is `false`, so `askPushAnyway` returns `false` immediately and the push is always aborted. The user never sees the prompt.

**Why it happens:** Git provides push ref data via the hook's stdin. This is a piped file descriptor, not the terminal. Node.js inherits it from the shell.

**How to avoid:** Add `exec < /dev/tty` (guarded by a TTY check) as the first non-comment line of the hook template, before calling `pusherg run`. This replaces the piped stdin with the actual terminal device.

**Warning signs:** During integration testing, the prompt never appears and the push always aborts after failure, regardless of what the user types.

### Pitfall 2: exec < /dev/tty fails in CI and breaks pushes

**What goes wrong:** Unconditional `exec < /dev/tty` in the hook template fails in Docker containers and CI systems where `/dev/tty` is not available. This causes every push to fail with a file-not-found error on CI.

**Why it happens:** `/dev/tty` requires an actual terminal session — it doesn't exist in many containerized CI runners.

**How to avoid:** Guard with `if [ -t 1 ]; then exec < /dev/tty; fi` or `if sh -c ": >/dev/tty" >/dev/null 2>/dev/null; then exec < /dev/tty; fi`. The `askPushAnyway` function will correctly return `false` (abort) in non-TTY environments because `process.stdin.isTTY` stays false.

**Warning signs:** CI pipeline fails on `git push` with message about `/dev/tty`.

### Pitfall 3: ESM import.meta.url — templates path resolution

**What goes wrong:** `__dirname` doesn't exist in ESM. Attempting to use it to locate the templates directory causes a `ReferenceError`.

**Why it happens:** CommonJS globals are not available in `"type": "module"` projects.

**How to avoid:** Use `fileURLToPath(new URL('.', import.meta.url))` to get the directory of the current module. When the init command is in `src/commands/init.js`, the template path is `../../templates/pre-push` relative to that file.

**Warning signs:** `ReferenceError: __dirname is not defined` during init.

### Pitfall 4: npx pusherg run vs node path in hook template

**What goes wrong:** If the hook calls `node ./node_modules/pusherg/bin/cli.js run` with a hardcoded path, the hook breaks when the tool is run via `npx` in a project that doesn't have pusherg in its local `node_modules`.

**Why it happens:** The hook is installed in the target project, not the pusherg source repo. The user may have run `npx pusherg init` without adding pusherg as a dependency.

**How to avoid:** Use `npx pusherg run` in the hook template. `npx` resolves the package from the global npx cache or runs the latest version, matching the canonical usage pattern.

### Pitfall 5: Commander action signature for options with cwd override in tests

**What goes wrong:** Commander passes the options object as the first argument to the action callback. If `runCommand` expects `(options, { cwd })`, tests must replicate this exact signature.

**How to avoid:** Design command modules to accept options as first arg, and an optional config object `{ cwd }` as second arg (the established project pattern). Tests call `runCommand({ force: false }, { cwd: tmpDir })` directly without going through Commander.

---

## Code Examples

### Hook template (complete)

```sh
#!/bin/sh
# pusherg pre-push hook
# Runs checks before every push. Skip with: git push --no-verify

# Restore terminal stdin so interactive prompts work in git hooks.
# Silently skips if not in an interactive terminal (CI, IDE, etc).
if [ -t 1 ]; then
  exec < /dev/tty
fi

npx pusherg run
```

### init command — file write + chmod

```javascript
// Source: Node.js fs/promises docs (stable API)
import { writeFile, chmod, access, mkdir } from 'fs/promises'
import { join } from 'path'

const hookContent = `#!/bin/sh\n# pusherg pre-push hook\n...`

await writeFile(hookPath, hookContent, 'utf8')
await chmod(hookPath, 0o755)
// Verify: the mode 0o755 is NOT affected by umask when using chmod() after write
```

### Commander async wiring

```javascript
// Source: Commander.js docs — parseAsync for async actions
import { program } from 'commander'
program.command('init').action(initCommand)
program.command('run').option('--force').action(runCommand)
await program.parseAsync(process.argv)
```

### Testing init with temp dir

```javascript
// Pattern established in Phase 1 — explicit cwd parameter enables test isolation
import { mkdtemp, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
await mkdir(join(tmpDir, '.git', 'hooks'), { recursive: true })
await initCommand({ cwd: tmpDir })
// assert hook file exists and is executable
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Husky as hook manager dependency | Direct `.git/hooks/pre-push` file write | Husky v9 moved to opt-in; direct write is simpler for single-tool CLIs | No external dependency; `init` command owns the file |
| `__dirname` in CommonJS | `fileURLToPath(new URL('.', import.meta.url))` in ESM | Node.js ESM (2020+) | Required for template path resolution |
| `program.parse()` | `program.parseAsync()` | Commander v8+ | Required when action handlers are async |

**Deprecated/outdated:**
- `fs.writeFileSync` with `mode` option: The mode parameter to `writeFile` is affected by the process umask and may not result in exactly 0o755. Use `writeFile` then `chmod` separately.

---

## Open Questions

1. **Hook already installed — overwrite or error?**
   - What we know: The `init` command will hit an existing file at `.git/hooks/pre-push`.
   - What's unclear: Should it silently overwrite, prompt to confirm, or error with a message?
   - Recommendation: Silently overwrite for MVP. The file is gitignored and belongs to pusherg. Add a message like "pusherg: hook updated" vs "pusherg: hook installed". LIFECYCLE-01 (remove command) is Phase 3, so no idempotency concern for v1.

2. **`.git/hooks/` directory may not exist in some edge cases**
   - What we know: `git init` creates `.git/hooks/` by default. Very old repos or custom `core.hooksPath` configs may differ.
   - What's unclear: Should init create the directory if missing?
   - Recommendation: Use `mkdir(join(cwd, '.git', 'hooks'), { recursive: true })` before writing the hook. Low cost, prevents one class of errors.

3. **`npx pusherg run` in hook — latency concern**
   - What we know: `npx` has startup overhead when resolving packages. In a warm npx cache this is ~200ms. Cold: up to 2s.
   - What's unclear: Is this acceptable UX?
   - Recommendation: Acceptable for MVP. The real check time (running build/test) dominates. Document in README in Phase 4.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All commands | Yes | v24.10.0 | — |
| git | SETUP-01 (init needs .git) | Yes | 2.50.1 | — |
| npm/npx | Hook template execution | Yes | (bundled with Node) | — |
| vitest | Testing | Yes (devDep) | 3.2.4 | — |

All dependencies available. No blockers.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 3.2.4 |
| Config file | `vitest.config.js` (exists, `environment: 'node'`) |
| Quick run command | `npx vitest run test/init.test.js test/run.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements — Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETUP-01 | `initCommand` writes hook file at `.git/hooks/pre-push` with mode 0o755 | unit | `npx vitest run test/init.test.js` | No — Wave 0 |
| SETUP-01 | `initCommand` exits 1 with message when no `.git` dir | unit | `npx vitest run test/init.test.js` | No — Wave 0 |
| DETECT-03 | `runCommand` calls `runScript` for each detected script | unit (spy) | `npx vitest run test/run.test.js` | No — Wave 0 |
| DETECT-04 | `runCommand` runs all scripts even when one fails (no fail-fast) | unit | `npx vitest run test/run.test.js` | No — Wave 0 |
| OUTPUT-01 | `printResult` called for each result | unit (spy) | `npx vitest run test/run.test.js` | No — Wave 0 |
| OUTPUT-02 | Result objects include `duration` ms (already in runner) | unit (existing) | `npx vitest run test/runner.test.js` | Yes |
| OUTPUT-04 | `askPushAnyway` called when failures exist | unit (spy) | `npx vitest run test/run.test.js` | No — Wave 0 |
| OUTPUT-05 | `askPushAnyway` returns false without TTY (already in prompt.js) | unit (existing) | `npx vitest run test/prompt.test.js` | Yes |
| LIFECYCLE-03 | `runCommand({ force: true })` exits 0 immediately | unit | `npx vitest run test/run.test.js` | No — Wave 0 |

**Note on integration testing (stdin/TTY):** Unit tests mock the service layer. The `exec < /dev/tty` hook behavior cannot be verified by vitest alone — it requires an actual `git push` against a real repo in a real terminal. Plan must include a manual integration test step for this specific scenario.

### Sampling Rate
- **Per task commit:** `npx vitest run test/init.test.js` or `npx vitest run test/run.test.js`
- **Per wave merge:** `npx vitest run` (full 43+ test suite)
- **Phase gate:** Full suite green before phase verification

### Wave 0 Gaps

- [ ] `test/init.test.js` — covers SETUP-01 (hook install, error on missing .git)
- [ ] `test/run.test.js` — covers DETECT-03, DETECT-04, OUTPUT-01, OUTPUT-04, LIFECYCLE-03

*(Existing `test/runner.test.js`, `test/prompt.test.js`, `test/reporter.test.js`, `test/detect.test.js` cover OUTPUT-02 and OUTPUT-05 already)*

---

## Sources

### Primary (HIGH confidence)
- [Git official docs — githooks#pre-push](https://git-scm.com/docs/githooks) — pre-push hook spec, stdin format, parameters, exit codes
- Node.js `fs/promises` docs (built-in, stable API) — `writeFile`, `chmod`, `access`, `mkdir`
- Commander.js npm page (14.0.3) — `parseAsync`, async action handlers
- Phase 1 SUMMARY files in `.planning/phases/01-foundation/` — established patterns, service module signatures, TTY guard behavior

### Secondary (MEDIUM confidence)
- [Inquirer.js issue #518](https://github.com/SBoudrias/Inquirer.js/issues/518) — `exec < /dev/tty` as canonical fix for interactive prompts in git hooks; confirmed by Inquirer.js maintainer
- [Husky issue #385](https://github.com/typicode/husky/issues/385) — TTY problem in git hooks, community workarounds
- [Git pre-push hook confirm gist](https://gist.github.com/mosra/19abea23cdf6b82ce891c9410612e7e1) — `read -n 1 -r < /dev/tty` pattern in shell script

### Tertiary (LOW confidence)
- WebSearch results on `[ -t 1 ]` as CI guard — pattern seen in multiple sources but no single authoritative reference; treat as LOW until tested in actual CI environment

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed, versions verified from npm registry
- Architecture: HIGH — Commander.js patterns from official docs; service module signatures from Phase 1 code
- Git hook TTY pitfall: HIGH — verified across Inquirer maintainer, Husky issues, shell script examples; cross-referenced
- CI guard for exec < /dev/tty: MEDIUM — correct reasoning, multiple sources, but not tested in CI
- Pitfalls: HIGH — most are concrete failure modes with root causes confirmed

**Research date:** 2026-04-03
**Valid until:** 2026-07-03 (stable domain — git hook behavior and Node.js fs API are highly stable)
