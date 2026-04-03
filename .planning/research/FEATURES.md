# Feature Research

**Domain:** Pre-push / git hook CLI tool (npx, zero-config, Node.js)
**Researched:** 2026-04-03
**Confidence:** HIGH

## Competitive Landscape

### Husky (~5M weekly downloads, industry standard)
A low-level git hook runner. Creates shell scripts in `.husky/`. Users must manually specify what to run in each hook. No auto-detection, no interactive prompts, no colored output summary. Just a primitive that invokes whatever commands you give it.

### lint-staged (~8M weekly downloads, pre-commit companion)
Not a hook runner — runs linters only on staged files. Always paired with husky. Solves "only lint changed files" not "protect before push."

### Lefthook (~400K weekly downloads, fast Go-based alternative)
YAML config, parallel execution, polyglot. Still requires manual config. No auto-detection or interactive UX. Targets teams who want speed and monorepo support.

### pre-push / git-pre-push (npm packages, abandoned)
The closest predecessors to pusherg. Both are effectively abandoned (last published 4+ years ago). Both require manual config in package.json. No interactive prompts, no colored output, no auto-detection, no package manager detection.

### simple-git-hooks (lightweight alternative to husky)
Zero-dependency hook installer. Config lives in package.json. Still manual — users write what commands to run. No auto-detection.

### Gap pusherg fills
Every existing tool requires the developer to write their own hook logic. None of them auto-detect what build/test/lint commands exist and wire them up without any configuration. None offer an interactive "push anyway?" prompt when checks fail. pusherg = Husky primitives + auto-detection + interactive feedback UX.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `npx pusherg init` one-command setup | Every modern CLI tool is npx-installable; husky itself uses `npx husky init` | LOW | Writes hook file + updates package.json prepare script |
| Hook installation into `.husky/` | Husky is the de-facto standard — users expect compatibility with this directory structure | LOW | Delegates actual hook management to husky |
| Run before `git push` fires | That is the product's core function | MEDIUM | git pre-push hook must intercept git push event |
| Exit with non-zero on failure to abort push | Git hooks abort operations on non-zero exit — this is the mechanism that makes it work | LOW | Standard git hook contract |
| `--no-verify` bypass compatibility | Developers universally know `git push --no-verify` to skip hooks; it must work | LOW | This is native git behavior — just don't break it |
| `pusherg remove` clean uninstall | Developers expect to be able to reverse installation cleanly | LOW | Remove hook file, clean up package.json |
| Clear error output when a check fails | Users need to know what failed and why to fix it | LOW | Print failing command's stdout/stderr |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auto-detection of build/test/lint scripts from package.json | Zero config — no manual wiring required; this is the core value prop | MEDIUM | Parse package.json scripts, heuristically match `build`, `test`, `lint`, `typecheck` patterns |
| Package manager detection (npm/yarn/pnpm) | Runs scripts with the right package manager without user config | LOW | Detect via lockfile presence: `package-lock.json` → npm, `yarn.lock` → yarn, `pnpm-lock.yaml` → pnpm |
| Colored pass/fail output with timing | Every other git hook tool has plain text output; color + timing is a UX leap | LOW | chalk for colors, measure elapsed ms per script |
| Interactive "Push anyway?" prompt on failure | No existing tool does this; allows escape hatch without `--no-verify` | MEDIUM | inquirer prompt that falls back to abort on non-TTY (CI) |
| `--force` flag to skip checks for current push | Explicit opt-out per-push without needing to know git internals | LOW | Pass `HUSKY=0` or check `PUSHERG_FORCE=1` env var |
| `pusherg status` command | Shows what hooks are installed, what scripts will run — confidence builder | LOW | Read hook file, read package.json, display summary |
| Spinner / progress feedback during checks | Users know something is happening; not blank terminal during long builds | LOW | ora spinners per-script |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Pre-commit hook support | Developers want lint/format protection at commit too | Scope creep for v1; pre-commit hooks need staged-file awareness (lint-staged territory), totally different problem space | Recommend husky + lint-staged for pre-commit; pusherg owns pre-push |
| Custom `.pushergrc` config file | Power users want to override auto-detected scripts | Config file adds maintenance burden and defeats the zero-config pitch; if you need config you can use husky directly | Auto-detection with sensible defaults handles 90% of cases |
| Watch mode / dev mode | Developers want continuous feedback | Not a hook use case — separate category of tool (vitest watch, vite HMR) | Redirect to native watch capabilities of test/build tools |
| Monorepo support | Many projects use monorepos | Per-package hook management is a fundamentally different problem; adds significant complexity | Lefthook is purpose-built for this — recommend it instead |
| CI-awareness auto-disable | Developers want hooks to no-op in CI | `CI=true` environment variable already standard; hooks can check it — but this belongs in husky primitives, not pusherg | Document that `HUSKY=0` or `CI=true` disables hooks |
| Run hooks in parallel | Faster execution | If build depends on lint passing, parallel execution causes confusing failures; sequential is safer and simpler for this use case | Keep sequential for v1; document rationale |

---

## Feature Dependencies

```
[Package manager detection]
    └──required by──> [Auto-detect scripts execution]
                           └──required by──> [Pre-push hook execution]
                                                  └──required by──> [Interactive prompt on failure]
                                                  └──required by──> [Colored pass/fail output]

[Hook installation (init command)]
    └──required by──> [Pre-push hook execution]
    └──required by──> [pusherg remove]
    └──required by──> [pusherg status]

[--force flag]
    └──enhances──> [Pre-push hook execution] (skip execution path)

[Interactive prompt]
    └──conflicts──> [Non-TTY / CI environments] (must detect and fall back to auto-abort)
```

### Dependency Notes

- **Package manager detection required by script execution:** Can't run `yarn test` if you detect npm, and vice versa. Must resolve package manager before running any scripts.
- **Hook installation required by everything:** The hook file is the entry point for all runtime features. init must succeed before any other feature works.
- **Interactive prompt conflicts with non-TTY:** In CI or piped environments, `process.stdin.isTTY` is false. Must detect and auto-abort (exit 1) rather than hang waiting for input.
- **Auto-detection required before hook execution:** The hook script needs to know which commands to run at install time (write them into the hook) or at run time (re-read package.json). Run-time re-read is more flexible and handles script changes after init.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] `npx pusherg init` — installs hook, detects scripts, writes hook file
- [ ] Package manager detection (npm/yarn/pnpm via lockfile)
- [ ] Auto-detection of build/test/lint scripts from package.json
- [ ] Pre-push hook execution: runs detected scripts sequentially
- [ ] Colored pass/fail output with timing per script
- [ ] Interactive "Push anyway?" prompt when a check fails (with TTY check)
- [ ] `--force` flag to skip all checks for a push
- [ ] `pusherg remove` — clean uninstall
- [ ] `pusherg status` — show installed hooks and detected scripts

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Bun package manager detection — add when bun adoption warrants it
- [ ] Custom script override via package.json `pusherg` key — add when users request config flexibility
- [ ] CI-awareness auto-disable documentation — add to README when CI usage questions arise

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Pre-commit hook support — only if users report husky + lint-staged is too complex to set up alongside pusherg
- [ ] Monorepo support — different product; only if significant demand
- [ ] TypeScript config detection — advanced script detection heuristics
- [ ] Parallel check execution — only if build times make sequential a blocker

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `npx pusherg init` one-command setup | HIGH | LOW | P1 |
| Package manager detection | HIGH | LOW | P1 |
| Auto-detect scripts from package.json | HIGH | MEDIUM | P1 |
| Pre-push hook execution | HIGH | MEDIUM | P1 |
| Colored pass/fail output with timing | HIGH | LOW | P1 |
| Interactive "Push anyway?" prompt | HIGH | MEDIUM | P1 |
| `--force` flag | MEDIUM | LOW | P1 |
| `pusherg remove` | MEDIUM | LOW | P1 |
| `pusherg status` | MEDIUM | LOW | P1 |
| Spinners during check execution | MEDIUM | LOW | P2 |
| Non-TTY / CI detection for prompt fallback | HIGH | LOW | P1 (correctness, not UX) |
| Custom config file (.pushergrc) | LOW | MEDIUM | P3 |
| Monorepo support | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | husky | lefthook | pre-push (abandoned) | pusherg |
|---------|-------|----------|----------------------|---------|
| Zero-config setup | No (manual hook scripts) | No (lefthook.yml required) | Partial (runs npm test by default) | Yes (auto-detect) |
| Auto-detect package.json scripts | No | No | No | Yes |
| Package manager detection | No | No | No | Yes |
| Interactive "push anyway?" prompt | No | No | No | Yes |
| Colored output with timing | No (user scripts can have it) | Partial (own output colored) | No | Yes |
| Spinners during execution | No | No | No | Yes |
| Clean uninstall command | No | No | No | Yes |
| Status command | No | No | No | Yes |
| `--force` flag | Via `HUSKY=0` env var | Via env var | No | Yes |
| Parallel execution | No | Yes | No | No (v1) |
| Monorepo support | Manual | Yes | No | No (v1) |
| Pre-commit hook support | Yes | Yes | Yes | No (v1) |
| Maintained | Yes | Yes | No (abandoned) | Yes |
| npx installable | Yes | Yes | Yes (outdated) | Yes |

---

## Sources

- [Husky official docs](https://typicode.github.io/husky/) — features and how it works
- [pkgpulse: husky vs lefthook vs lint-staged 2026](https://www.pkgpulse.com/blog/husky-vs-lefthook-vs-lint-staged-git-hooks-nodejs-2026) — MEDIUM confidence (single source, verified against official docs)
- [GitHub: clearhead/pre-push](https://github.com/clearhead/pre-push) — competitor analysis
- [GitHub: evilmartians/lefthook](https://github.com/evilmartians/lefthook) — competitor analysis
- [npm: detect-package-manager](https://www.npmjs.com/package/detect-package-manager) — lockfile detection pattern
- [git-scm.com: githooks documentation](https://git-scm.com/docs/githooks) — git hook exit code behavior, --no-verify flag
- [WebSearch: git hook bypass patterns 2024-2025] — --no-verify, HUSKY=0 patterns (MEDIUM confidence)

---
*Feature research for: pre-push CLI tool (pusherg)*
*Researched: 2026-04-03*
