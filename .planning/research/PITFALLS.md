# Pitfalls Research

**Domain:** Git hook CLI tool (npx, pre-push hooks, interactive prompts, package manager detection)
**Researched:** 2026-04-03
**Confidence:** HIGH — sourced from official Husky docs, confirmed GitHub issues, Node.js docs, and multiple community reports

## Critical Pitfalls

### Pitfall 1: Interactive Prompts Fail Inside Git Hooks (stdin is Not a TTY)

**What goes wrong:**
When a git hook invokes a Node.js script that uses `inquirer` (or any prompt library), the prompt silently auto-answers, hangs, or throws `isTtyError`. The user never sees the "Push anyway?" prompt. The hook either passes through silently or aborts without explanation.

**Why it happens:**
Git executes hooks as subprocesses. The hook's `stdin` is already consumed by git — it carries the pre-push refs data (local ref, local SHA, remote ref, remote SHA). `process.stdin.isTTY` is `undefined` or `false`. Inquirer's `prompt()` requires an interactive TTY and rejects with `isTtyError` when it is not present. Even when using Husky, multiple confirmed issues document this exact failure mode (typicode/husky#850, typicode/husky#1129, SBoudrias/Inquirer.js#518).

**How to avoid:**
The pre-push hook shell script must redirect stdin from the terminal device before calling the Node.js script:
```sh
#!/bin/sh
exec < /dev/tty
node /path/to/pusherg-runner.js
```
On Windows Git Bash, `/dev/tty` may not exist. Guard with a TTY check:
```sh
#!/bin/sh
[ -t 1 ] && exec < /dev/tty
node /path/to/pusherg-runner.js
```
Alternatively, in the Node.js script, explicitly open `/dev/tty` as the input stream for Inquirer. Always implement a non-interactive fallback: detect `process.stdin.isTTY === undefined` and skip the prompt, defaulting to abort-on-failure.

**Warning signs:**
- Prompt never appears during local testing of the hook
- Hook exits with code 0 even when tests fail (silent pass-through)
- `isTtyError: true` in error output
- Works when run directly (`node runner.js`) but not via `git push`

**Phase to address:**
Phase implementing the pre-push hook and runner. Must be validated with an actual `git push` in a real repo, not just `node script.js` in isolation.

---

### Pitfall 2: Pre-push stdin Data Conflicts with Interactive Input

**What goes wrong:**
The pre-push hook receives push metadata on `stdin` (which refs are being pushed, SHAs, remote name). If the hook script consumes stdin for interactive prompts without first capturing the git data, the ref information is lost. Alternatively, if the script reads git's stdin data correctly but then tries to reopen `/dev/tty` for prompts, race conditions or platform differences cause one or both reads to fail.

**Why it happens:**
Git's pre-push hook uses stdin for two different purposes depending on the consumer: the hook framework reads it for push ref data, and the developer wants to use stdin for interactive input. These are mutually exclusive on the same file descriptor. Lefthook documented this explicitly (evilmartians/lefthook#147). Husky v4 solved this with `HUSKY_GIT_STDIN`, but that was removed in v5+.

**How to avoid:**
Read and buffer git's stdin data first (the push refs), then redirect stdin from `/dev/tty` before showing any prompts. In the hook shell script:
```sh
#!/bin/sh
# Git push data is available via stdin — buffer it or ignore it
# Then re-open terminal for interactive input
exec < /dev/tty
node pusherg-runner.js
```
In the Node.js runner, if you need push ref data (e.g., to show what branches are being pushed), read it before Inquirer is initialized using `readline` on the original stdin file descriptor. For pusherg's MVP, the push ref data is likely not needed — document this decision.

**Warning signs:**
- Hook crashes with "read EPIPE" or empty stdin reads
- Interactive prompt appears but keyboard input is not echoed
- Hook works on first `git push` but not on subsequent ones

**Phase to address:**
Phase implementing the hook template and runner. Design the stdin handling strategy before writing any prompt code.

---

### Pitfall 3: npx Serves a Stale Cached Version

**What goes wrong:**
A user runs `npx pusherg init` and gets an old cached version of the package, not the latest. New features, bug fixes, or breaking-change fixes are invisible to the user. This is particularly dangerous for a tool that modifies `.git/hooks/` — an outdated hook template may be installed.

**Why it happens:**
npx caches packages locally. Once cached, it reuses the cached version without checking the registry, even when newer versions exist. This is a confirmed longstanding bug in npm/npx (npm/cli#2329, npm/cli#4108, npm/cli#7838). The behavior is inconsistent across npm versions.

**How to avoid:**
In the published package's README and CLI `--help` output, document `npx pusherg@latest init` as the canonical invocation. Consider adding a version check in the `init` command that fetches the latest version from the npm registry and warns if the running version is behind. Do not rely on users having the current version — always write hook files that are version-agnostic or include a version comment for debugging.

**Warning signs:**
- Users report bugs that are fixed in the latest changelog
- `npx pusherg --version` output differs from npm registry `latest` tag
- Hook behavior differs between fresh install and re-install

**Phase to address:**
Phase implementing the `init` command and hook installation. Document `@latest` in all user-facing copy before publishing.

---

### Pitfall 4: Hook File Loses Executable Bit

**What goes wrong:**
The hook file is written to `.git/hooks/pre-push` but is not executable. Git silently ignores it. The developer runs `git push`, the hook does nothing, and pusherg appears to have no effect. No error is shown — git simply skips non-executable hooks.

**Why it happens:**
When Node.js writes a file using `fs.writeFile`, the default mode is `0o666` (no execute bit). The hook must have execute permissions (`chmod +x`) to run. This is easily missed because the file exists and looks correct when inspected. Multiple husky issues confirm this is a recurring source of confusion (typicode/husky#934, typicode/husky#1177, typicode/husky#1301).

**How to avoid:**
After writing the hook file, explicitly set its permissions:
```js
import { chmod } from 'fs/promises';
await chmod(hookPath, 0o755);
```
Verify in the `status` command by checking `fs.statSync(hookPath).mode & 0o111` — if the execute bit is absent, warn the user. Add a post-install verification step in `pusherg init` that checks the written file is actually executable.

**Warning signs:**
- `git push` completes instantly with no hook output
- `ls -la .git/hooks/pre-push` shows `-rw-r--r--` instead of `-rwxr-xr-x`
- Git outputs: "hint: The pre-push hook was ignored because it's not set as executable"

**Phase to address:**
Phase implementing the `init` command (hook installation). The executable bit check must be in the test suite, not just manual testing.

---

### Pitfall 5: Hook Bypassed via `git push --no-verify`

**What goes wrong:**
Users who know about `--no-verify` bypass the hook entirely. This is expected behavior (by git design), but if pusherg's documentation implies the hook "prevents" bad pushes unconditionally, users will be misled. Additionally, if the hook catches a CI failure flag or environment variable that skips checks, developers may accidentally push broken code.

**Why it happens:**
`git push --no-verify` is a built-in git escape hatch that skips all client-side push hooks. It is not a bug — it is documented git behavior. However, tools that don't acknowledge this create false security guarantees.

**How to avoid:**
Document clearly in pusherg's README that this is a developer-side quality tool, not a security enforcement mechanism. The `--force` flag pusherg provides is a supported, explicit override — document it as the intended bypass mechanism rather than `--no-verify`. Never describe pusherg as "preventing" pushes in absolute terms.

**Warning signs:**
- User confusion when "the tool didn't stop me"
- CI pipelines being used as the only safety net (fine, but should be explicit)

**Phase to address:**
Documentation phase. Set accurate expectations in README before publishing.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode `npm run` for all commands | Avoids package manager detection complexity | Breaks in yarn/pnpm projects | Never — detection is a stated requirement |
| Write hook using absolute path to `node` | Simple implementation | Breaks if user's node is in a non-standard location | Never for distributed tool |
| Skip TTY check, always attempt prompt | Simpler code path | Silent hang or crash in non-TTY environments (CI, pipe) | Never |
| Only check for `yarn.lock` / `package-lock.json` | Simple lockfile detection | Misses `pnpm-lock.yaml`, Bun, and `packageManager` field | Acceptable in MVP if Bun is deferred |
| Use `exec < /dev/tty` without Windows guard | Works on macOS/Linux | `exec < /dev/tty` fails on Windows Git Bash where `/dev/tty` may not exist | Acceptable if Windows is out of scope, but document it |
| No timeout on build/test runner | Less complexity | User's hook hangs forever on a hanging test suite | Never — always set a configurable timeout |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Husky v9+ | Using `husky add` command (removed in v9) | Manually create `.husky/pre-push` file with correct content; use `husky` as the prepare script |
| Husky v9+ | Expecting `HUSKY_GIT_STDIN` to exist | Read stdin directly in the hook using `readline` or shell `while read` loop |
| Inquirer v9+ (ESM) | Using CJS `require('inquirer')` | Inquirer v9+ is ESM-only; use `import` — matches pusherg's ESM-first stack |
| execa v8+ | Using CJS `require('execa')` | execa v8+ is ESM-only; use `import` |
| Package manager detection | Only checking lockfile existence in cwd | Also check `packageManager` field in package.json (Corepack standard); traverse up to project root if needed |
| Hook template | Hardcoding `#!/bin/bash` shebang | Use `#!/bin/sh` for portability; `/bin/bash` may not exist on all systems |
| Hook template | Using `/dev/stdin` | `/dev/stdin` is Linux-specific, not POSIX; use `&0` or shell stdin redirection |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running all detected scripts sequentially | Each command adds full startup time; a large project with build + test + lint takes 3+ minutes | Run commands in parallel when they are independent; show per-command timing | Any project with more than 2 scripts |
| Re-running `npm install` or package manager check on every hook invocation | Hook startup takes 2-5 seconds before any tests run | Cache the detected package manager and command list in a lightweight config file; check cache first | Every `git push` |
| Child process inherits parent's large environment | Subprocess start time increases; potential variable leakage | Spawn child processes with a clean, minimal env | Projects with large `.env` files or many shell exports |
| No timeout on child processes | A hanging test (e.g., unclosed server) causes `git push` to hang indefinitely | Set explicit timeout via execa's `timeout` option; default to 5 minutes, make configurable | Any test suite with async resource leaks |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Writing hook file content that includes unsanitized user input | An attacker who controls the project name or detected script name could inject shell commands into the hook | Never interpolate detected script names directly into shell hook content; use `node -e` or a Node.js runner that receives args, not shell interpolation |
| Hook template reads environment variables that could be poisoned | A compromised shell environment could alter which commands run | Validate detected commands against the project's own package.json scripts, not arbitrary env vars |
| `pusherg remove` uses `rm -f` without path validation | A bug in path construction could delete unintended files | Always validate the resolved path is inside `.git/hooks/` before deletion; use `path.resolve` and assert prefix |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Output goes to stdout instead of stderr inside the hook | Some git environments suppress stdout from hooks; user sees no output | Write all pusherg hook output to `process.stderr`; git does not suppress stderr from hooks |
| Showing no output during long build/test run | User thinks the hook is stuck or `git push` is broken | Show a spinner (ora) with the currently-running command and elapsed time |
| "Push anyway?" prompt defaults to Yes | A distracted user pressing Enter skips the check | Default to No for the "Push anyway?" prompt; require explicit `y` confirmation |
| Error message is a raw Node.js stack trace | Non-technical users see incomprehensible output | Catch all errors, display a clean one-line message, and optionally show stack trace with `--debug` flag |
| `pusherg init` silently overwrites an existing hook | User loses custom hook logic | Detect existing hook content; if not written by pusherg, ask before overwriting or append rather than replace |

---

## "Looks Done But Isn't" Checklist

- [ ] **Hook execution:** Test with an actual `git push` command, not just `node runner.js` directly — TTY behavior is different
- [ ] **Interactive prompt:** Verify the "Push anyway?" prompt actually appears and accepts keyboard input during a real `git push`
- [ ] **Executable bit:** After `pusherg init`, verify `ls -la .git/hooks/pre-push` shows execute permissions
- [ ] **Package manager detection:** Test in a pnpm project — `pnpm run build` vs `npm run build` may produce different behavior
- [ ] **Non-interactive fallback:** Run the hook in a CI environment (no TTY) and verify it fails cleanly instead of hanging
- [ ] **Uninstall:** After `pusherg remove`, verify `git push` no longer triggers the hook at all
- [ ] **ESM compatibility:** Verify `npx pusherg` works without `--experimental-vm-modules` or CJS fallback errors
- [ ] **Windows Git Bash:** The `/dev/tty` redirect is the most likely Windows-specific failure — test or explicitly document as unsupported

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Interactive prompt never shows | MEDIUM | Add `exec < /dev/tty` to hook template; re-run `pusherg init` to reinstall hook |
| Stale npx cache | LOW | Document `npx pusherg@latest` in README; user clears cache with `npx clear-npx-cache` |
| Hook not executable | LOW | `pusherg status` detects and reports; `pusherg init --repair` can re-chmod |
| Husky version mismatch | MEDIUM | Pin husky peer dependency version range; test against husky v8 and v9 specifically |
| Hook broken after manual edit | LOW | `pusherg remove && pusherg init` restores known-good state |
| Process hangs on test suite | HIGH | Add timeout to execa call; expose `PUSHERG_TIMEOUT` env var as escape hatch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| stdin / TTY conflict with interactive prompt | Phase: Hook runner + prompt implementation | Run `git push` in a real repo, verify prompt appears |
| Pre-push stdin data conflicts with TTY redirect | Phase: Hook template design | Test with push that sends multiple refs; verify git data and prompt both work |
| npx stale cache | Phase: Publishing + documentation | Document `@latest` in README; add version-check warning in `init` command |
| Hook loses executable bit | Phase: `init` command implementation | Unit test that written hook has mode `0o755`; integration test with `git push` |
| `--no-verify` bypass expectations | Phase: Documentation | README review before npm publish |
| Husky v9 API changes (`husky add` removal) | Phase: `init` command (hook installation) | Test `pusherg init` on a fresh project with husky v9 installed |
| Process hangs | Phase: Runner implementation | Integration test with a test suite that has an intentional hang; verify timeout fires |
| Output suppressed (stdout vs stderr) | Phase: Reporter implementation | Run hook in a simulated git environment; verify output is visible |

---

## Sources

- [Husky Troubleshoot Docs](https://typicode.github.io/husky/troubleshoot.html) — official troubleshooting guide
- [Husky Issue #1052: pre-push lacks access to stdin](https://github.com/typicode/husky/issues/1052) — stdin conflict design issue
- [Husky Issue #850: v5 stdin is not a tty](https://github.com/typicode/husky/issues/850) — TTY problem on migration
- [Husky Issue #1129: How to get Husky pre-commit to await user prompt](https://github.com/typicode/husky/issues/1129) — inquirer in hooks
- [Inquirer.js Issue #518: Running under a git hook auto answers](https://github.com/SBoudrias/Inquirer.js/issues/518) — root cause and `/dev/tty` workaround
- [Lefthook Issue #147: pre-push hook missing stdin values](https://github.com/evilmartians/lefthook/issues/147) — stdin forwarding problem in hook managers
- [npm/cli Issue #2329: npx does not attempt to get newer versions](https://github.com/npm/cli/issues/2329) — stale npx cache
- [npm/cli Issue #4108: npx isn't using latest version](https://github.com/npm/cli/issues/4108) — stale cache confirmation
- [detect-package-manager npm package](https://www.npmjs.com/package/detect-package-manager) — lockfile-based detection reference
- [Husky How To Guide](https://typicode.github.io/husky/how-to.html) — CI skip patterns
- [Git githooks documentation](https://git-scm.com/docs/githooks) — official stdin spec for pre-push
- [Node.js TTY documentation](https://nodejs.org/api/tty.html) — `process.stdin.isTTY` behavior

---
*Pitfalls research for: git hook CLI tool (pusherg)*
*Researched: 2026-04-03*
