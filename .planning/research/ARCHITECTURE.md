# Architecture Research

**Domain:** Zero-config npx CLI tool with git hook management
**Researched:** 2026-04-03
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Entry Layer                           │
│  bin/cli.js  →  commander  →  dispatch to command module         │
├─────────────────────────────────────────────────────────────────┤
│                       Command Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  init    │  │  run     │  │  status  │  │  remove  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
├───────┴─────────────┴─────────────┴─────────────┴───────────────┤
│                       Service Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ detect   │  │ runner   │  │ reporter │  │ prompt   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                      External Boundary                           │
│  ┌──────────────┐  ┌────────────┐  ┌────────────────────────┐   │
│  │ filesystem   │  │  git CLI   │  │  child processes       │   │
│  │ (pkg.json,   │  │ (config,   │  │  (build, test, lint)   │   │
│  │  hooks dir)  │  │  hooks)    │  │                        │   │
│  └──────────────┘  └────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `bin/cli.js` | Parse argv, register commands with commander, dispatch | All command modules |
| `src/commands/init.js` | Orchestrate hook installation flow | detect, runner, prompt, git |
| `src/commands/run.js` | Execute checks (invoked by git hook itself) | detect, runner, reporter, prompt |
| `src/commands/status.js` | Read and display current hook config | filesystem, reporter |
| `src/commands/remove.js` | Tear down hooks, restore git config | filesystem, git |
| `src/detect.js` | Read package.json, infer scripts and package manager | filesystem only |
| `src/runner.js` | Spawn subprocesses, capture output, track timing | execa, OS processes |
| `src/reporter.js` | Format and print results with colors | chalk, ora, stdout |
| `src/prompt.js` | Show interactive "push anyway?" prompt | inquirer, stdin |
| `templates/pre-push` | Shell stub that delegates to `pusherg run` | (static template) |

## Recommended Project Structure

```
pusherg/
├── bin/
│   └── cli.js              # Entry point — commander setup and command registration only
├── src/
│   ├── commands/
│   │   ├── init.js         # npx pusherg init — installs hook
│   │   ├── run.js          # pusherg run — executes checks (called by hook)
│   │   ├── status.js       # pusherg status — shows what's configured
│   │   └── remove.js       # pusherg remove — uninstalls hook
│   ├── detect.js           # Read package.json, detect scripts and package manager
│   ├── runner.js           # Subprocess execution via execa, timing, exit codes
│   ├── reporter.js         # Format results with chalk/ora, print summary
│   └── prompt.js           # Inquirer prompt: "Push anyway? [y/N]"
├── templates/
│   └── pre-push            # Shell stub written to .git/hooks or via core.hooksPath
├── test/
│   ├── detect.test.js
│   ├── runner.test.js
│   ├── reporter.test.js
│   └── commands/
│       ├── init.test.js
│       └── run.test.js
├── package.json
├── README.md
└── LICENSE
```

### Structure Rationale

- **`bin/cli.js` is thin:** Only wires commander and requires command modules. No logic lives here. This is the pattern used by husky (bin.js delegates immediately to index.js) and lint-staged (bin/ delegates to lib/).
- **`src/commands/` matches the CLI surface:** One file per subcommand. Each command orchestrates the services but owns no business logic itself. Keeps commands independently testable.
- **`src/` services are pure functions:** `detect.js`, `runner.js`, `reporter.js`, and `prompt.js` take inputs and produce outputs. No global state. Easy to unit test in isolation.
- **`templates/pre-push` is static:** A shell script that just calls `pusherg run`. Written to disk by `init.js`. Git runs it natively. No runtime dependency on Node for the hook invocation.

## Architectural Patterns

### Pattern 1: Thin Entry, Fat Services

**What:** `bin/cli.js` does nothing but register commands. Each command module orchestrates services. Services contain all logic.

**When to use:** Any CLI tool with multiple subcommands. Used by lint-staged, husky, create-react-app.

**Trade-offs:** Adds indirection, but makes every layer independently testable without spawning the full CLI process.

**Example:**
```javascript
// bin/cli.js — thin
import { program } from 'commander'
import { initCommand } from '../src/commands/init.js'
import { runCommand } from '../src/commands/run.js'

program.command('init').description('Install pre-push hook').action(initCommand)
program.command('run').description('Run checks').action(runCommand)
program.parse()
```

### Pattern 2: Context Object Flowing Through a Pipeline

**What:** The `run` command builds a context object once (detected scripts, package manager, cwd) and passes it through runner → reporter → prompt. No re-reads, no globals.

**When to use:** When multiple steps need the same data. Directly how lint-staged works — `ctx` object carries state through every step.

**Trade-offs:** Slightly more verbose than global state, but dramatically easier to test (just pass a fake ctx).

**Example:**
```javascript
// src/commands/run.js
export async function runCommand(options) {
  const ctx = await detect(process.cwd())   // { scripts, packageManager, projectName }
  const results = await runner(ctx)          // { passed, failed, timings }
  reporter.printSummary(results)
  if (results.failed.length > 0 && !options.force) {
    const proceed = await prompt.askPushAnyway()
    if (!proceed) process.exit(1)
  }
}
```

### Pattern 3: Shell Stub Hook Template

**What:** The installed git hook is a plain shell script that calls `npx pusherg run` (or the locally installed binary). The Node process starts fresh on each push.

**When to use:** Always for git hooks. Husky uses exactly this pattern — `.husky/pre-push` contains shell commands, not Node.

**Trade-offs:** Adds ~100ms startup cost per push. Acceptable because pushes are user-initiated, not frequent.

**Example:**
```sh
#!/usr/bin/env sh
# .git/hooks/pre-push — written by pusherg init
. "$(dirname -- "$0")/_/husky.sh"
npx pusherg run
```

Or, without husky dependency:
```sh
#!/usr/bin/env sh
# pre-push hook installed by pusherg
node "$(npm root -g)/pusherg/bin/cli.js" run || \
  ./node_modules/.bin/pusherg run
```

### Pattern 4: Package Manager Detection via Lock Files

**What:** `detect.js` checks for `yarn.lock`, `pnpm-lock.yaml`, `package-lock.json` to determine which package manager to use when invoking scripts.

**When to use:** Any tool that needs to run project scripts without assuming npm. Used by create-react-app, Vite, and similar scaffolders.

**Trade-offs:** Lock file presence is a heuristic, not guaranteed. Cover the common cases; default to npm.

**Example:**
```javascript
export async function detectPackageManager(cwd) {
  if (await exists(path.join(cwd, 'yarn.lock'))) return 'yarn'
  if (await exists(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  return 'npm'  // default
}
```

## Data Flow

### `pusherg init` Flow (setup time — run once by developer)

```
Developer: npx pusherg init
    ↓
bin/cli.js → commands/init.js
    ↓
detect.js → reads package.json → returns { scripts, packageManager }
    ↓
prompt.js → confirm detected scripts (optional confirm step)
    ↓
write templates/pre-push → .git/hooks/pre-push  (chmod +x)
    ↓
OR: git config core.hooksPath .pusherg/
    ↓
reporter.js → print "Hook installed! Will run: build, test"
```

### `pusherg run` Flow (every push — invoked by git)

```
git push
    ↓
.git/hooks/pre-push (shell stub)
    ↓
bin/cli.js → commands/run.js
    ↓
detect.js → reads package.json → ctx = { scripts, packageManager }
    ↓
runner.js → for each script:
    - execa(packageManager, ['run', scriptName])
    - capture stdout/stderr, track timing, capture exit code
    ↓
reporter.js → print pass/fail per script + timing
    ↓
[if all pass] → exit 0 → git push continues
[if any fail] → prompt.js → "Push anyway? [y/N]"
    ↓
[y] → exit 0 → git push continues
[N] → exit 1 → git push aborted
```

### `pusherg status` Flow

```
pusherg status
    ↓
commands/status.js
    ↓
check .git/hooks/pre-push exists + is ours (contains "pusherg" marker)
    ↓
detect.js → read package.json → get configured scripts
    ↓
reporter.js → print hook status + scripts that will run
```

### Key Data Shapes

```javascript
// detect.js output
const ctx = {
  cwd: '/path/to/project',
  packageManager: 'npm' | 'yarn' | 'pnpm',
  scripts: ['build', 'test', 'lint'],  // ordered: build first, then test, then lint
  projectName: 'my-app',
}

// runner.js output per script
const result = {
  name: 'build',
  command: 'npm run build',
  passed: true | false,
  exitCode: 0,
  duration: 4231,  // ms
  stdout: '...',
  stderr: '...',
}
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| git (CLI) | Shell commands via execa | `git config core.hooksPath`, read `.git/hooks/` |
| npm/yarn/pnpm | execa subprocess | `npm run build` — detected from lock files |
| filesystem | Node.js `fs/promises` | Read `package.json`, write hook file, `chmod +x` |
| stdin/stdout | process.stdio | reporter writes to stdout; prompt reads from stdin |

### Internal Module Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `commands/* → detect.js` | Direct import, returns ctx object | detect is pure — no side effects |
| `commands/run.js → runner.js` | Passes ctx.scripts array, gets results array back | runner is pure — no printing |
| `commands/run.js → reporter.js` | Passes results array | reporter only prints, returns nothing |
| `commands/run.js → prompt.js` | Calls ask(), receives boolean | prompt is isolated; easy to mock in tests |
| `commands/init.js → templates/pre-push` | fs.readFile(templatePath), fs.writeFile(hookPath) | template is a static file, not a module |

### Hook Installation — Two Valid Approaches

**Approach A: Write directly to `.git/hooks/pre-push`** (simpler, no husky dependency)
- Pro: Self-contained, no additional dependency in target project
- Con: `.git/` is not version-controlled; hook disappears on fresh clone
- Use when: User just wants personal protection on their machine

**Approach B: Use `git config core.hooksPath` pointing to a committed directory**
- Pro: Hook survives clones — whole team gets it
- Con: Requires a committed `.pusherg/` or `.githooks/` directory in target project
- Use when: Team-wide enforcement is desired

Recommendation: Approach A for MVP simplicity. Document Approach B as the "team" upgrade path.

## Anti-Patterns

### Anti-Pattern 1: Logic in bin/cli.js

**What people do:** Put detect, run, and report logic directly in the commander action handlers in `bin/cli.js`.

**Why it's wrong:** Makes the tool impossible to test without spawning a process. Cannot unit test the detection or runner logic.

**Do this instead:** `bin/cli.js` imports and calls exported functions from `src/commands/`. Commands call services. Services are plain functions.

### Anti-Pattern 2: Global State Between Runs

**What people do:** Store detected scripts in a module-level variable or write a `.pushergrc` cache file.

**Why it's wrong:** `pusherg run` is invoked fresh every push by git. There is no persistent process. Re-reading `package.json` on each run is the right model — it's fast (< 5ms) and always reflects current state.

**Do this instead:** `detect.js` reads from disk every invocation. No caching, no persistent state.

### Anti-Pattern 3: Running Scripts in Series with a Shell String

**What people do:** Concatenate script commands into a shell string like `npm run build && npm run test` and pass to execa with `shell: true`.

**Why it's wrong:** Exit code handling is fragile. Timing individual scripts is impossible. Shell injection risk on unusual script names.

**Do this instead:** Run each script as a separate execa call in sequence. Capture results per-script. Stop on first failure (or collect all failures depending on desired behavior).

### Anti-Pattern 4: Catching All Errors and Exiting Silently

**What people do:** Wrap the entire `run` command in a try/catch that calls `process.exit(1)` silently.

**Why it's wrong:** If pusherg itself has a bug (not the user's scripts), the developer sees the push abort with no explanation.

**Do this instead:** Distinguish between "script failed" (expected failure, print results) and "pusherg internal error" (unexpected, print the error and a bug report URL, then exit 1).

## Build Order (Component Dependencies)

The dependency graph dictates this build order — each module only depends on modules built before it:

```
1. src/detect.js          — no internal deps, pure filesystem reads
2. src/runner.js          — no internal deps, wraps execa
3. src/reporter.js        — no internal deps, formats and prints
4. src/prompt.js          — no internal deps, wraps inquirer
5. src/commands/run.js    — depends on detect, runner, reporter, prompt
6. src/commands/init.js   — depends on detect, reporter, prompt
7. src/commands/status.js — depends on detect, reporter
8. src/commands/remove.js — depends on reporter
9. bin/cli.js             — depends on all commands
10. templates/pre-push    — static file, written any time
```

Build and test each service before wiring commands. Build and test commands before wiring the CLI entry point.

## Scaling Considerations

This is a CLI tool, not a server. "Scaling" means: does it work correctly on large projects with slow test suites?

| Concern | Approach |
|---------|----------|
| Slow test suites (10+ min) | Spinner via ora keeps terminal responsive; no timeout |
| Large package.json with many scripts | detect.js filters to known script name patterns (build, test, lint, typecheck) |
| Monorepo (future) | Out of scope for MVP; hook template can be extended later |
| CI environments | `--force` flag and `PUSHERG_SKIP=1` env var bypass all checks |

## Sources

- [lint-staged core architecture — DeepWiki](https://deepwiki.com/lint-staged/lint-staged/2-core-architecture) — HIGH confidence, authoritative wiki
- [husky GitHub repository](https://github.com/typicode/husky) — HIGH confidence, official source
- [Building CLI Tools with Node.js — Java Code Geeks](https://www.javacodegeeks.com/2025/03/building-cli-tools-with-node-js.html) — MEDIUM confidence
- [Commander.js definitive guide — Better Stack](https://betterstack.com/community/guides/scaling-nodejs/commander-explained/) — HIGH confidence
- [Execa v9 release notes](https://medium.com/@ehmicky/execa-9-release-d0d5daaa097f) — HIGH confidence, official author
- [git core.hooksPath pattern — Git Hooks Complete Guide](https://devtoolbox.dedyn.io/blog/git-hooks-complete-guide) — MEDIUM confidence

---
*Architecture research for: pusherg — zero-config npx pre-push CLI tool*
*Researched: 2026-04-03*
