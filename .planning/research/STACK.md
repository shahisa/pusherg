# Stack Research

**Domain:** Zero-config npx pre-push CLI tool (Node.js)
**Researched:** 2026-04-03
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | >=18.19.0 | Runtime | LTS baseline; 18.19.0+ required by execa v9. Most users on Node 18+ already. |
| ESM (`"type":"module"`) | — | Module system | Modern standard; all chosen dependencies are ESM-only since their current major versions. Mixing CJS would require dual builds. |
| commander | ^13.1.0 | CLI argument/command parsing | Industry standard for Node.js CLIs. v13 is the last major supporting Node 18 (v14 bumped to Node 20). Maintained, widely used (124k dependents). |
| chalk | ^5.4.1 | Terminal color output | Actively maintained, ESM-only since v5, zero dependencies. Standard choice for colored CLI output. v5.4.1 is latest (supports Node 12+, no compatibility concern). |
| ora | ^8.2.0 | Terminal spinners | ESM-only since v6. v8.x is the last major supporting Node 18 (v9 requires Node 20+). Correct pin for this project's Node baseline. |
| execa | ^9.6.1 | Child process execution | Purpose-built for scripts/CLIs: better error messages, streaming, typed results. ESM-only since v6. v9.6.1 latest, requires Node ^18.19.0 or >=20.5.0. |
| @inquirer/prompts | ^7.10.1 | Interactive CLI prompts | Modern rewrite of inquirer. v7.x is the last major supporting Node 18 (v8 requires Node 20+). 60% smaller than legacy inquirer, cleaner async/await API. |
| husky | ^9.1.7 | Git hook installation into target project | Mature, reliable git hook management. v9.1.7 latest, supports Node 18+. Writes `.husky/pre-push` and sets `core.hooksPath` via `npx husky init`. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^3.2.4 | Unit and integration testing | v3.x supports Node 18 (v4 requires Node 20). Fast, native ESM support, no transform needed. Use for all test coverage. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| vitest | Test runner | `vitest run` for CI, `vitest watch` for dev. Config via `vitest.config.js` or inline `package.json`. |
| npm | Package manager for this project | Project is published to npm; use `npm pack` to verify bundle before publishing. |

## Installation

```bash
# Runtime dependencies (what ships with pusherg)
npm install commander@^13.1.0 chalk@^5.4.1 ora@^8.2.0 execa@^9.6.1 @inquirer/prompts@^7.10.1 husky@^9.1.7

# Dev dependencies
npm install -D vitest@^3.2.4
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| commander@^13 | yargs | Yargs is better for complex option parsing with coercion. Commander is simpler for subcommand CLIs (`init`, `run`, `status`, `remove`) with less boilerplate. |
| commander@^13 | commander@^14 | Use v14 only if Node >=20 is your target. This project targets Node 18, so v14's Node 20 requirement is a breaking incompatibility. |
| @inquirer/prompts@^7 | legacy inquirer@^13 | Both support Node 18. @inquirer/prompts is the official successor; legacy inquirer is "maintenance only." No reason to use legacy for a new project. |
| @inquirer/prompts@^7 | @clack/prompts | @clack/prompts (~4KB) is smaller and has beautiful opinionated output. Good choice if you want no configuration. However, @inquirer/prompts is official successor to inquirer and more widely known. Either works. |
| @inquirer/prompts@^7 | enquirer | enquirer is stable, CJS-compatible, used by eslint/yarn/pnpm. Good alternative, but last published 2021 — maintenance risk for a new project. |
| ora@^8 | ora@^9 | Use v9 only if Node >=20. v9 requires Node 20; v8 is the correct choice for Node 18 compatibility. |
| ora@^8 | cli-spinners (raw) | ora wraps cli-spinners with a clean API. Only use cli-spinners directly if you need customization ora doesn't expose. |
| husky | simple-git-hooks | simple-git-hooks is lighter (~zero config from package.json). Use for simple projects. Husky is preferable here because pusherg needs to programmatically write and manage hook files, which maps better to husky's CLI + file-based model. |
| husky | native `git config core.hooksPath` | Valid approach — avoids a dependency. Pusherg could write hook files and call `git config core.hooksPath .husky` via execa directly. This is architecturally sound and reduces the dependency chain. Recommended if the husky dependency adds friction for users. |
| vitest@^3 | jest | Jest requires transform config for ESM. Vitest is native ESM. Zero config for an ESM project. |
| vitest@^3 | vitest@^4 | v4 requires Node 20+. v3 supports Node 18. Pin to v3 for the stated Node 18 baseline. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| commander@^14 | Requires Node 20+; breaks the Node 18 compatibility guarantee | commander@^13.1.0 |
| ora@^9 | Requires Node 20+; breaks the Node 18 compatibility guarantee | ora@^8.2.0 |
| @inquirer/prompts@^8 | Requires Node 20+; breaks the Node 18 compatibility guarantee | @inquirer/prompts@^7.10.1 |
| vitest@^4 | Requires Node 20+; breaks the Node 18 compatibility guarantee | vitest@^3.2.4 |
| legacy `inquirer` (not `@inquirer/prompts`) | Marked "maintenance only" by maintainers; no active development | @inquirer/prompts@^7 |
| pre-push (npm package) | 5+ years unmaintained, no interactive prompts, no auto-detection | Build the behavior directly using execa + husky |
| chalk@^4 | CJS-era version; v5 is ESM and actively maintained. No reason to use v4 in an ESM project | chalk@^5.4.1 |
| TypeScript compilation step | Adds build complexity for a CLI tool with no public API surface. Node 18+ handles JSDoc type annotations well. | Plain ESM JavaScript + JSDoc comments if types needed |

## Stack Patterns by Variant

**If targeting Node >=20 in the future:**
- Upgrade commander to ^14, ora to ^9, @inquirer/prompts to ^8, vitest to ^4
- All are drop-in compatible within their major; no API changes needed for this project's usage

**If dropping husky as a dependency:**
- Use execa to run `git config core.hooksPath .pusherg` in the target project
- Write hook files to `.pusherg/pre-push` using `fs.writeFile`
- This removes one transitive install from users' projects — worth considering for a zero-config tool where minimal footprint matters

**If adding a confirm-only prompt without the full @inquirer/prompts bundle:**
- `@inquirer/confirm` is a standalone package (part of the @inquirer/* monorepo), single prompt type, smaller footprint
- Import as: `import { confirm } from '@inquirer/confirm'`

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| commander@^13.1.0 | Node ^18.0.0 | Last major before Node 20 requirement |
| chalk@^5.4.1 | Node >=16 | No practical compatibility concerns |
| ora@^8.2.0 | Node >=18 | v8 is last Node 18 compatible series |
| execa@^9.6.1 | Node ^18.19.0 or >=20.5.0 | Note: Node 18.0.0–18.18.x will NOT work. Minimum is 18.19.0. |
| @inquirer/prompts@^7.10.1 | Node >=18 | v7 is last Node 18 compatible series |
| husky@^9.1.7 | Node >=18 | No issue |
| vitest@^3.2.4 | Node ^18.0.0 or ^20.0.0 or >=22.0.0 | v3 is last series supporting Node 18 |

**Critical:** Declare `"engines": { "node": ">=18.19.0" }` in package.json, not `>=18.0.0`. Execa v9 requires at least 18.19.0. Any Node 18.0.0–18.18.x user would hit a runtime error otherwise.

## Sources

- npm registry (live) — commander, chalk, ora, execa, @inquirer/prompts, husky, vitest engines fields verified
- https://github.com/tj/commander.js/blob/master/CHANGELOG.md — commander v13/v14 Node.js requirements
- https://github.com/sindresorhus/ora/releases — ora v8/v9 split at Node 20
- https://www.npmjs.com/package/@inquirer/prompts — @inquirer/prompts v7/v8 split at Node 20
- https://vitest.dev/blog/vitest-3 — vitest v3/v4 split at Node 20
- https://typicode.github.io/husky/ — husky v9 installation and hook management
- https://github.com/SBoudrias/Inquirer.js — @inquirer/prompts is official successor to legacy inquirer

---
*Stack research for: zero-config pre-push CLI tool (pusherg)*
*Researched: 2026-04-03*
