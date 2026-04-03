# Codebase Concerns

**Analysis Date:** 2026-04-03

## Implementation Status

**Not Yet Implemented:**
- Issue: This is a planning-stage project with no source code written yet
- Files: Only planning documents exist (`01-PROJECT-OVERVIEW.md`, `02-DAY1-PLAN.md`, `03-DAY2-PLAN.md`, `04-DAY3-PLAN.md`, `05-DAY4-PUBLISH.md`)
- Impact: Cannot evaluate actual code quality, security, or performance
- Fix approach: Execute the 4-day implementation plan to create the codebase

## Pre-Implementation Planning Concerns

**Project Scope Validation:**
- Issue: NPM package name availability not yet verified
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/01-PROJECT-OVERVIEW.md` (lines 7-11)
- Impact: May need to rename package before publishing
- Fix approach: Run `npm view pusherg`, `npm view pushsafe`, `npm view pushcheck-cli`, `npm view git-pusherg` to check availability before Day 4

**Dependency Version Pinning:**
- Issue: No package.json exists yet, dependency versions not specified in plans
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/02-DAY1-PLAN.md` (lines 46-50)
- Impact: May install breaking versions of commander, chalk, ora, execa, inquirer
- Fix approach: Pin specific versions during Day 1 setup, use `^` for minor updates only

**Testing Strategy Gaps:**
- Issue: Test coverage not defined, critical paths may be untested
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/04-DAY3-PLAN.md` (Task 1, lines 9-48)
- Impact: Integration tests missing (e.g., full git push flow, husky interaction)
- Fix approach: Add integration tests beyond unit tests; test actual git hook execution

**Cross-Platform Compatibility:**
- Issue: Windows support mentioned but not thoroughly planned
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/04-DAY3-PLAN.md` (line 63)
- Impact: Hook file permissions, path separators, shell scripts may fail on Windows
- Fix approach: Test on Windows before v0.1.0, use `execa` correctly, consider .bat/.cmd wrapper for hooks

## Anticipated Technical Debt

**Monorepo Support Deferred:**
- Issue: Monorepo support explicitly listed as "post-MVP"
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/01-PROJECT-OVERVIEW.md` (lines 82-89)
- Impact: Tool will run all tests even if changes affect single package
- Scaling path: Implement change detection via git diff, use workspace detection

**Configuration File Not Implemented:**
- Issue: `.pushergrc` config file mentioned throughout but deferred to post-MVP
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/03-DAY2-PLAN.md` (line 38), `/Users/isa/Documents/Indie Hacker Projects/pusherg/04-DAY3-PLAN.md` (line 94)
- Impact: Users cannot customize timeout, command order, or skip specific checks
- Fix approach: Add .pushergrc support in v0.2.0 with schema validation

**Timeout Hardcoded:**
- Issue: 5-minute timeout per command mentioned but no override mechanism planned for MVP
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/03-DAY2-PLAN.md` (line 38)
- Impact: Large test suites may hit timeout; users have no escape hatch
- Workaround: Document `--no-verify` flag prominently
- Fix approach: Add timeout config in .pushergrc or --timeout flag

**Bail-Early Option Incomplete:**
- Issue: Fail-fast behavior mentioned but defaulting to "run all steps"
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/03-DAY2-PLAN.md` (lines 140-143)
- Impact: Developers wait for all checks even after build fails
- Fix approach: Add `--bail` flag or `bail: true` config option

## Security Considerations

**Git Hook Injection:**
- Risk: If user-provided config is ever added, could enable arbitrary command execution
- Files: Future `.pushergrc` implementation
- Current mitigation: None (not implemented yet)
- Recommendations: When adding config support, sanitize/validate commands, use allowlist not blocklist

**Dependency Supply Chain:**
- Risk: Third-party dependencies (commander, chalk, ora, execa, inquirer, husky) could be compromised
- Files: Future `package.json`
- Current mitigation: None
- Recommendations: Use `npm audit` in CI, pin dependency versions, consider --ignore-scripts during install

**Secrets in Test Output:**
- Risk: Command output is captured and displayed; could leak env vars or API keys
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/03-DAY2-PLAN.md` (lines 22-32), `/Users/isa/Documents/Indie Hacker Projects/pusherg/src/runner.js` (planned)
- Current mitigation: None planned
- Recommendations: Filter output for common secret patterns (API_KEY=, Bearer, sk-), add --redact flag

**Hook File Permissions:**
- Risk: Pre-push hook file may not be executable on some systems
- Files: `.husky/pre-push` (to be created)
- Current mitigation: Mentioned in error handling (Day 3, line 62)
- Recommendations: Ensure `chmod +x` is run during init, add verification in status command

## Performance Bottlenecks

**No Caching Strategy:**
- Problem: Every push re-runs full build/test suite even if no files changed
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/src/commands/run.js` (planned)
- Cause: No build artifact caching or incremental testing
- Improvement path: Add --incremental flag that checks git diff, skip build if no source changes

**Output Buffering:**
- Problem: Streaming output may cause performance issues with verbose test frameworks
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/03-DAY2-PLAN.md` (line 36)
- Cause: Real-time streaming to terminal vs. buffering
- Improvement path: Add buffer size limit, tail output if exceeds threshold

**Sequential Execution:**
- Problem: Build, test, lint run sequentially; could parallelize test + lint
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/03-DAY2-PLAN.md` (lines 134-139)
- Cause: Simplicity for MVP
- Improvement path: Add --parallel flag, run independent checks concurrently

## Missing Critical Features

**No Dry-Run Mode:**
- Problem: No way to test what would run without actually running it
- Blocks: Debugging, onboarding new developers
- Fix approach: Add `pusherg run pre-push --dry-run` that prints detected commands without executing

**No Skip Individual Checks:**
- Problem: Cannot skip just build or just lint; only --no-verify skips everything
- Blocks: Workflows where build is cached but tests need to run
- Fix approach: Add `--skip-build`, `--skip-test`, `--skip-lint` flags

**No Exit Code Customization:**
- Problem: Always exits 0 if user says "push anyway", even in CI
- Blocks: Strict CI enforcement policies
- Fix approach: Add `--strict` mode that ignores interactive override

**Pre-Commit Hook Support:**
- Problem: Only pre-push implemented; no pre-commit for linting
- Blocks: Faster feedback loop (catch lint errors before commit vs. before push)
- Fix approach: Add `pusherg init --hook=pre-commit` option

## Test Coverage Gaps

**Git Hook Execution Not Tested:**
- What's not tested: Actual git push triggering the hook
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/test/` (planned)
- Risk: Hook template could be malformed, path resolution could break
- Priority: High

**Husky Version Compatibility:**
- What's not tested: Different husky versions (v8 vs. v9+)
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/src/commands/init.js` (planned)
- Risk: Init command may use deprecated husky API
- Priority: High

**Edge Case: No Scripts Detected:**
- What's not tested: Behavior when package.json has zero valid scripts
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/03-DAY2-PLAN.md` (line 172)
- Risk: May exit 1 and block push unnecessarily
- Priority: Medium

**CI Environment Detection:**
- What's not tested: All CI environment variables (CI, CONTINUOUS_INTEGRATION, GITHUB_ACTIONS, etc.)
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/03-DAY2-PLAN.md` (lines 96-103)
- Risk: May show interactive prompt in CI, hanging builds
- Priority: High

**Package Manager Detection:**
- What's not tested: Projects with multiple lockfiles (e.g., both package-lock.json and yarn.lock)
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/02-DAY1-PLAN.md` (lines 133-140)
- Risk: May choose wrong package manager
- Priority: Medium

**SIGINT Handling:**
- What's not tested: Ctrl+C during long-running test, child process cleanup
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/04-DAY3-PLAN.md` (lines 68-74)
- Risk: Zombie processes, corrupted terminal state
- Priority: Medium

## Dependencies at Risk

**inquirer v9+ Breaking Changes:**
- Risk: inquirer moved to ESM-only in v9, may cause import issues
- Impact: Interactive prompts break
- Migration plan: Pin to v8.x for stability or ensure ESM-only project

**Husky v9 API Changes:**
- Risk: Husky changed init behavior between v8 and v9
- Impact: Hook installation fails on certain versions
- Migration plan: Test against both v8 and v9, document minimum supported version

**execa v8+ Node.js Requirement:**
- Risk: execa v8 requires Node.js 18.19+, not just 18.0+
- Impact: Fails on slightly older Node 18 versions
- Migration plan: Update engines requirement or pin execa to v7

## Fragile Areas

**Hook Template Path Resolution:**
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/templates/pre-push` (planned)
- Why fragile: Relative path to husky.sh, npx resolution, may break in monorepos
- Safe modification: Use absolute paths where possible, test in nested directories
- Test coverage: Missing integration test

**Auto-Detection Logic:**
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/src/detect.js` (planned)
- Why fragile: package.json parsing, script name heuristics, placeholder detection regex
- Safe modification: Add strict JSON schema validation, whitelist known placeholders
- Test coverage: Unit tests planned, but edge cases not enumerated

**Output Parsing:**
- Files: `/Users/isa/Documents/Indie Hacker Projects/pusherg/src/runner.js` (planned)
- Why fragile: Capturing "last 10 lines" of output, handling ANSI codes
- Safe modification: Use strip-ansi library, define clear truncation rules
- Test coverage: Not mentioned in test plan

## Launch Blockers

**npm Package Name Collision:**
- Issue: May discover `pusherg` is taken on Day 4
- Impact: Last-minute rename breaks all references, screenshots, docs
- Fix approach: Check availability on Day 1, reserve name early

**License File Missing:**
- Issue: LICENSE file mentioned but not created in any task
- Impact: Cannot publish to npm without license
- Fix approach: Add MIT license file in Day 1 or Day 3

**Repository Not Initialized:**
- Issue: No git repo exists (confirmed by `git status` check)
- Impact: Cannot test git hooks, cannot track changes, cannot push to GitHub
- Fix approach: Run `git init` before starting Day 1 tasks

**README Terminal Recording:**
- Issue: asciinema/terminalizer mentioned but not in task checklist
- Impact: README is less compelling without demo
- Fix approach: Record demo during Day 3 final quality pass

---

*Concerns audit: 2026-04-03*
