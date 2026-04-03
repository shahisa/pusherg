# Technology Stack

**Analysis Date:** 2026-04-03

## Languages

**Primary:**
- JavaScript (ES Modules) - All application code
  - Version: Node.js >= 18 required
  - Module system: ESM (`"type": "module"`)

## Runtime

**Environment:**
- Node.js >= 18

**Package Manager:**
- npm (default)
- Also supports: yarn, pnpm (auto-detected in target projects)
- Lockfile: Not yet present (project not initialized)

## Frameworks

**Core:**
- commander (latest) - CLI framework for command-line argument parsing and command structure

**Testing:**
- vitest (latest) - Test framework for unit testing

**Build/Dev:**
- None - Ships as plain JavaScript with ESM modules
- No build step required for the CLI itself

## Key Dependencies

**Critical:**
- commander - CLI framework, handles command routing and argument parsing
- chalk - Terminal string styling with colors for user feedback
- ora - Terminal spinners for progress indication during hook execution
- execa - Better child process execution for running build/test/lint commands
- inquirer - Interactive command-line prompts for "Push anyway?" confirmation

**Infrastructure:**
- husky - Git hooks management (installed as devDependency in TARGET projects, not a dependency of pusherg itself)

## Configuration

**Environment:**
- No environment variables required for pusherg itself
- Target projects may require their own env vars for build/test commands

**Build:**
- No build configuration needed
- Entry point: `bin/cli.js` (executable with shebang `#!/usr/bin/env node`)

## Platform Requirements

**Development:**
- Node.js >= 18
- Git (required for hook installation)
- npm/yarn/pnpm for dependency management

**Production:**
- Distributed via npm registry
- Installed via `npx pusherg` (no global installation required)
- Runs in any project with `package.json` and `.git/` directory

---

*Stack analysis: 2026-04-03*
