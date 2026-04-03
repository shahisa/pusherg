# CLAUDE.md

## Project
Building "pusherg" — a zero-config npx pre-push CLI tool that runs build/test checks before git push with interactive feedback.

## Rules
- NEVER delete files or directories outside this project
- NEVER run `rm -rf` or `rm -r` on any directory
- NEVER touch the `.git/` directory directly
- NEVER run `npm publish` — I will do this manually
- NEVER install global packages (no `-g` flag)
- NEVER modify system files or configs outside this project
- Commit with a descriptive message after completing each task
- If unsure about a destructive action, stop and ask

## Workflow
1. Read the relevant plan file in `plans/` before starting a task
2. Build one task/module at a time
3. Run tests after building each module
4. Commit after each completed task
5. If something breaks, fix it before moving to the next task

## Tech Stack
- Node.js >= 18, ESM (`"type": "module"`)
- CLI: commander
- Terminal UI: chalk, ora, inquirer
- Process: execa
- Testing: vitest
- Git hooks: husky (installed in TARGET project, not as our dependency)
- License: MIT

## File Structure
```
pusherg/
├── bin/cli.js           # Entry point
├── src/
│   ├── commands/        # init, run, status, remove
│   ├── detect.js        # Auto-detect project scripts
│   ├── runner.js        # Execute commands
│   ├── reporter.js      # Format results
│   └── prompt.js        # Interactive prompts
├── templates/pre-push   # Hook template
├── test/                # Vitest tests
├── plans/               # Build plans (reference only)
├── README.md
├── LICENSE
└── package.json
```

## Naming
- Package name: `pusherg`
- CLI command: `pusherg`
- All user-facing output should reference "pusherg"
