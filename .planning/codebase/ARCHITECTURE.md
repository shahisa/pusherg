# Architecture

**Analysis Date:** 2026-04-03

## Pattern Overview

**Overall:** Command-line orchestrator with modular pipeline architecture

**Key Characteristics:**
- CLI command dispatcher pattern (using commander.js)
- Modular pipeline: detect → run → report → prompt
- Process spawning and monitoring architecture
- Interactive terminal UI with fallback for CI environments

## Layers

**CLI Layer:**
- Purpose: Parse commands and route to appropriate handlers
- Location: `bin/cli.js`
- Contains: Command definitions, argument parsing, version management
- Depends on: Command modules in `src/commands/`
- Used by: Terminal invocation via `npx pusherg <command>`

**Command Layer:**
- Purpose: Implement business logic for each CLI command
- Location: `src/commands/`
- Contains: `init.js` (setup), `run.js` (execution orchestrator), `config.js` (future), plus `status` and `remove` commands
- Depends on: Core modules (`detect.js`, `runner.js`, `reporter.js`, `prompt.js`)
- Used by: CLI layer

**Detection Layer:**
- Purpose: Auto-discover project configuration from package.json and lockfiles
- Location: `src/detect.js`
- Contains: Package.json parsing, script detection, package manager identification
- Depends on: File system access
- Used by: Init and run commands

**Execution Layer:**
- Purpose: Spawn and monitor child processes for build/test/lint commands
- Location: `src/runner.js`
- Contains: Process spawning via execa, output streaming, timeout management, exit code capture
- Depends on: execa library, child process APIs
- Used by: Run command

**Reporting Layer:**
- Purpose: Format and display execution results
- Location: `src/reporter.js`
- Contains: Terminal output formatting, spinners, result tables, timing display
- Depends on: chalk (colors), ora (spinners)
- Used by: Run command

**Interaction Layer:**
- Purpose: Handle user input for failure scenarios
- Location: `src/prompt.js`
- Contains: Interactive prompts, CI detection, TTY detection
- Depends on: inquirer library
- Used by: Run command on check failures

## Data Flow

**Installation Flow (init command):**

1. User runs `npx pusherg init`
2. CLI layer routes to `src/commands/init.js`
3. Validate environment (git repo exists, package.json present)
4. Call `detect.js` to identify available scripts and package manager
5. Execute `npx husky init` to install husky
6. Write `.husky/pre-push` hook file from `templates/pre-push`
7. Display summary via reporter with detected configuration

**Pre-Push Execution Flow (run command):**

1. Git pre-push hook triggers `npx pusherg run pre-push`
2. CLI layer routes to `src/commands/run.js`
3. Run command loads configuration (from detect.js or future .pushergrc)
4. For each check (build → test → lint):
   - Display spinner via reporter
   - Execute via runner.js
   - Collect result (passed/failed, duration, output)
5. Display summary table via reporter
6. If any checks failed:
   - Check if interactive (TTY + not CI)
   - If interactive: show prompt.js ("Push anyway?", "Abort", "Re-run")
   - If CI: exit 1 immediately
7. Exit with appropriate code (0 = proceed, 1 = block)

**State Management:**
- No persistent application state
- Configuration discovered on-demand from package.json
- Hook state managed by Husky (not stored by pusherg)
- Results held in memory during execution only

## Key Abstractions

**Command Object:**
- Purpose: Represents a single check to execute
- Examples: Used in `src/runner.js`, `src/commands/run.js`
- Pattern: `{ name: 'test', command: 'npm test' }`

**Result Object:**
- Purpose: Captures execution outcome for a single command
- Examples: Returned by `src/runner.js`, consumed by `src/reporter.js`
- Pattern: `{ name, command, passed, exitCode, duration, output }`

**Detected Config:**
- Purpose: Represents auto-discovered project settings
- Examples: Returned by `src/detect.js`
- Pattern: `{ build, test, lint, packageManager }` (values are command strings or null)

## Entry Points

**CLI Entry Point:**
- Location: `bin/cli.js`
- Triggers: `npx pusherg <command>` from terminal
- Responsibilities: Parse arguments, dispatch to command handlers

**Git Hook Entry Point:**
- Location: `.husky/pre-push` (installed in target project)
- Triggers: `git push` operation
- Responsibilities: Invoke `npx pusherg run pre-push`

## Error Handling

**Strategy:** Fail-fast with clear user-facing messages

**Patterns:**
- Validation errors (no git repo, no package.json): Exit early with explanation
- Process spawn failures: Catch and report as check failure
- JSON parse errors: Catch and suggest fixing package.json
- Husky installation failures: Catch and suggest manual installation
- SIGINT (Ctrl+C): Graceful shutdown, kill child processes, show partial results
- Missing scripts: Skip silently, show warning in summary

## Cross-Cutting Concerns

**Logging:** Terminal output only (chalk for colors, ora for spinners) - no file logging

**Validation:** Pre-flight checks in init command (git repo, package.json), runtime validation in run command

**Authentication:** Not applicable (no external services)

**CI Detection:** Environment variable checks (`CI`, `CONTINUOUS_INTEGRATION`) + TTY detection (`process.stdin.isTTY`)

**Cross-Platform:** execa handles Windows/Unix process spawning differences, path.join for file paths

---

*Architecture analysis: 2026-04-03*
