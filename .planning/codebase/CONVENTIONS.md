# Coding Conventions

**Analysis Date:** 2026-04-03

## Project Status

**Current State:** Planning phase - no application source code written yet.

**Existing Code:** Claude Code GSD hooks only (JavaScript files in `.claude/hooks/`)

## Planned Stack (from PROJECT-OVERVIEW.md)

**Language:** JavaScript (ES Modules)
**Runtime:** Node.js >=18
**Package Type:** `"type": "module"` in package.json

## Naming Patterns (Observed in GSD Hooks)

**Files:**
- Kebab-case for executables: `gsd-prompt-guard.js`, `gsd-check-update.js`
- Descriptive names with domain prefix: `gsd-statusline.js`, `gsd-context-monitor.js`

**Functions:**
- camelCase: `detectConfigDir()`, `process.stdin.on()`
- Descriptive action verbs: `clearTimeout()`, `detectConfigDir()`

**Variables:**
- camelCase for locals: `stdinTimeout`, `cacheFile`, `homeDir`
- UPPER_SNAKE_CASE for constants: `INJECTION_PATTERNS`, `AUTO_COMPACT_BUFFER_PCT`

**Constants:**
- All-caps for configuration values
- Descriptive names: `AUTO_COMPACT_BUFFER_PCT` not `BUFFER`

## Code Style (GSD Hooks Analysis)

**Formatting:**
- No formatter detected (no `.prettierrc` or similar)
- 2-space indentation (observed in `.claude/hooks/gsd-prompt-guard.js`)
- Single quotes for strings
- Semicolons used consistently

**Linting:**
- No linter config files detected (no `.eslintrc*`, `eslint.config.*`, or `biome.json`)

**Line Length:**
- Pragmatic - breaks at natural boundaries
- Long strings broken with concatenation

## Import Organization (Planned)

**Planned Pattern (from Day 1 plan):**
```javascript
#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { runCommand } from '../src/commands/run.js';
```

**Order:**
1. Node built-ins (implied by GSD hooks: `fs`, `path`, `os`, `child_process`)
2. External packages (e.g., `commander`, `chalk`)
3. Local modules with explicit `.js` extensions

**Path Style:**
- Relative imports with explicit file extensions: `'../src/commands/init.js'`
- ES module compatibility: always include `.js`

## Error Handling (GSD Hooks Pattern)

**Silent Fail for Non-Critical Operations:**
```javascript
try {
  // Operation
} catch (e) {
  // Silent fail - don't break tool execution
  process.exit(0);
}
```

**Pattern:** Hooks use try/catch with silent failures to avoid breaking the parent tool
**Rationale:** Utility code should never interrupt main operations

**Guard Timeouts:**
```javascript
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
// ... operation ...
clearTimeout(stdinTimeout);
```

**Pattern:** Timeout guards prevent hanging on stdin issues

## Logging (Planned)

**Framework:** None specified (console methods planned)

**Planned Pattern (from Day 1):**
- Colored output via `chalk`
- Spinners via `ora`
- Structured success/error messages with symbols (✔, ✗)

## Comments

**When to Comment:**
- File headers with purpose: `// GSD Prompt Injection Guard — PreToolUse hook`
- Complex logic explanation: `// Normalize: subtract buffer from remaining, scale to usable range`
- Behavioral notes: `// Silent fail — never block tool execution`
- Version tracking: `// gsd-hook-version: 1.30.0`

**Header Pattern:**
```javascript
#!/usr/bin/env node
// gsd-hook-version: 1.30.0
// [Tool Name] — [Hook Event Type]
// [Multi-line description of purpose]
```

**Inline Comments:**
- Explain "why" not "what"
- Document edge cases and workarounds

## Function Design

**Size:**
- Single-purpose functions
- GSD hooks contain inline logic (not extracted) for deployment simplicity

**Parameters:**
- Named parameters with clear intent
- Example: `detectConfigDir(baseDir)`

**Return Values:**
- Early returns for guard clauses
- `process.exit(0)` for successful termination in hooks

## Module Design (Planned)

**Exports (from Day 1 plan):**
```javascript
// Named exports
export { initCommand, runCommand };
```

**Module Structure:**
- `bin/cli.js` - Entry point with shebang
- `src/commands/*.js` - Command implementations
- `src/*.js` - Utility modules (detect, runner, reporter, prompt)

**Barrel Files:**
- Not planned - direct imports preferred

## Planned Application Conventions

**CLI Structure:**
- Commander.js for CLI framework
- Commands as separate modules
- Options with sensible defaults

**Async Patterns:**
- Use `execa` for process spawning
- Promise-based async operations

**Configuration:**
- Auto-detection over explicit config (core philosophy)
- Optional `.pushergrc` planned for post-MVP

---

*Convention analysis: 2026-04-03*
