# pusherg

Zero-config pre-push CLI tool that runs your build and test checks before every `git push`.

## Quick Start

```bash
# Install the pre-push hook in your project
npx pusherg@latest init

# That's it! Every git push now runs your checks automatically.
```

## What It Does

When you `git push`, pusherg automatically:

1. Detects your `build`, `test`, `lint`, and `typecheck` scripts from `package.json`
2. Detects your package manager (npm, yarn, or pnpm) from lockfiles
3. Runs all detected scripts and shows colored pass/fail results
4. If anything fails, prompts you to push anyway or abort

```
  ✓ build (1204ms)
  ✓ lint (340ms)
  ✗ test (2105ms)

1 check(s) failed.
? Push anyway? (y/N)
```

## Commands

### `pusherg init`

Installs a `pre-push` git hook in the current repository.

```bash
npx pusherg init
```

### `pusherg run`

Runs all checks manually (this is what the hook calls).

```bash
npx pusherg run
npx pusherg run --force  # skip all checks
```

## Skip Checks

```bash
# Skip for a single push
git push --no-verify
```

## CI / Non-Interactive Environments

In non-TTY environments (CI, IDE git clients, etc.), pusherg automatically aborts the push when checks fail — it never hangs waiting for input.

## Supported Scripts

pusherg looks for these scripts in your `package.json`:

- `build`
- `test`
- `lint`
- `typecheck` / `type-check`

If none are found, the push goes through with no checks.

## Requirements

- Node.js >= 18.19.0
- A git repository with a `package.json`

## License

MIT
