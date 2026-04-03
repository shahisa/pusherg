# Codebase Structure

**Analysis Date:** 2026-04-03

## Directory Layout

```
pusherg/
├── .claude/                    # GSD framework and Claude tooling (not part of package)
├── .planning/                  # GSD codebase mapping outputs
├── bin/                        # CLI entry point (executable)
│   └── cli.js
├── src/                        # Core implementation modules
│   ├── commands/               # Command handlers (init, run, status, remove)
│   ├── detect.js
│   ├── runner.js
│   ├── reporter.js
│   ├── prompt.js
│   └── index.js
├── templates/                  # Git hook template files
│   └── pre-push
├── test/                       # Vitest test files
│   ├── detect.test.js
│   ├── runner.test.js
│   └── reporter.test.js
├── package.json
├── README.md
├── LICENSE
└── CLAUDE.md                   # Development guide for Claude
```

## Directory Purposes

**.claude/**
- Purpose: GSD (Get Shit Done) framework for project management
- Contains: Agent definitions, commands, hooks, workflows, templates
- Key files: `gsd-file-manifest.json`, agent markdown files
- Note: Not included in npm package (not in `files` field)

**.planning/**
- Purpose: Codebase mapping outputs for GSD workflow
- Contains: Architecture and structure analysis documents
- Key files: `ARCHITECTURE.md`, `STRUCTURE.md`

**bin/**
- Purpose: Executable CLI entry point
- Contains: `cli.js` with shebang (`#!/usr/bin/env node`)
- Key files: `bin/cli.js`
- Note: Referenced in package.json `bin` field

**src/**
- Purpose: Core application logic
- Contains: Modular components for detection, execution, reporting, interaction
- Key files: `detect.js`, `runner.js`, `reporter.js`, `prompt.js`, `index.js`

**src/commands/**
- Purpose: CLI command implementations
- Contains: Command handlers for init, run, status, remove, config
- Key files: `init.js`, `run.js` (plus status/remove to be added)

**templates/**
- Purpose: Template files copied to target projects
- Contains: Git hook scripts
- Key files: `templates/pre-push`

**test/**
- Purpose: Test suite using Vitest
- Contains: Unit tests for core modules
- Key files: `detect.test.js`, `runner.test.js`, `reporter.test.js`

## Key File Locations

**Entry Points:**
- `bin/cli.js`: CLI executable entry point
- `src/index.js`: Main module exports for programmatic use

**Configuration:**
- `package.json`: Package metadata, dependencies, bin definition
- Future: `.pushergrc` in target projects (post-MVP)

**Core Logic:**
- `src/commands/init.js`: Hook installation and setup
- `src/commands/run.js`: Pre-push check orchestration
- `src/detect.js`: Auto-detection of project scripts
- `src/runner.js`: Process execution engine
- `src/reporter.js`: Terminal output formatting
- `src/prompt.js`: Interactive user prompts

**Testing:**
- `test/*.test.js`: Vitest test files

**Documentation:**
- `README.md`: User-facing documentation
- `CLAUDE.md`: Development guidelines and project context
- `01-PROJECT-OVERVIEW.md` through `06-CLAUDE-CODE-CHEATSHEET.md`: Planning documents

## Naming Conventions

**Files:**
- Lowercase with kebab-case: Not yet established (no code files exist)
- Test files: `*.test.js` (e.g., `detect.test.js`)
- Template files: Lowercase without extensions (e.g., `pre-push`)

**Directories:**
- Lowercase singular or plural as appropriate: `commands`, `templates`, `test`

**Planning Docs:**
- UPPERCASE or numbered prefixes: `CLAUDE.md`, `01-PROJECT-OVERVIEW.md`

## Where to Add New Code

**New CLI Command:**
- Implementation: `src/commands/<command-name>.js`
- Registration: Add to `bin/cli.js` using `program.command()`
- Tests: `test/<command-name>.test.js`

**New Core Module:**
- Implementation: `src/<module-name>.js`
- Export: Add to `src/index.js` if public API
- Tests: `test/<module-name>.test.js`

**New Git Hook Template:**
- Template file: `templates/<hook-name>` (e.g., `templates/pre-commit`)
- Installation logic: Update `src/commands/init.js`

**New Utilities:**
- Shared helpers: Create `src/utils/` directory (not yet exists)
- Or: Add to existing modules if tightly coupled

**Configuration Files:**
- Future `.pushergrc` support: Add parser in `src/config.js`
- Schema/validation: Co-locate with parser

## Special Directories

**.claude/**
- Purpose: GSD framework installation
- Generated: No (committed to repo)
- Committed: Yes
- Note: Contains workflow automation, agent definitions, hooks

**.planning/**
- Purpose: Codebase analysis outputs from GSD mapping
- Generated: Yes (by GSD agents)
- Committed: Yes (provides context for future development)

**node_modules/**
- Purpose: npm dependencies
- Generated: Yes (npm install)
- Committed: No (in .gitignore)

**.husky/** (in target projects, not this repo)
- Purpose: Git hooks installed by pusherg
- Generated: Yes (by `pusherg init`)
- Committed: Yes (by target projects)
- Note: pusherg writes to this directory in target projects

## Package Distribution

**Included in npm package (via `files` field in package.json):**
- `bin/`
- `src/`
- `templates/`
- `package.json`
- `README.md`
- `LICENSE`

**Excluded from npm package:**
- `.claude/` - Development tooling
- `.planning/` - Analysis documents
- `test/` - Test files
- Planning markdown files (01-06 series)
- `CLAUDE.md` - Development guide
- Development dependencies (husky, vitest, etc.)

## Current State

**Project Status:** Planning phase - no implementation code exists yet

**Existing Files:**
- Planning documents (01-PROJECT-OVERVIEW.md through 06-CLAUDE-CODE-CHEATSHEET.md)
- GSD framework installation (.claude/ directory)
- CLAUDE.md development guide
- .planning/codebase/ for mapping outputs

**Missing (to be built per Day 1-3 plans):**
- All src/ modules
- bin/cli.js
- templates/pre-push
- test/ files
- package.json with proper dependencies
- README.md
- LICENSE

---

*Structure analysis: 2026-04-03*
