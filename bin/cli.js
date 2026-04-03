#!/usr/bin/env node
import { program } from 'commander'
import { initCommand } from '../src/commands/init.js'
import { runCommand } from '../src/commands/run.js'

program
  .name('pusherg')
  .description('Zero-config pre-push checks')
  .version('0.1.0')

program
  .command('init')
  .description('Install pre-push hook in the current git repo')
  .action(async () => {
    await initCommand()
  })

program
  .command('run')
  .description('Run all pre-push checks (called by the hook)')
  .option('--force', 'Skip all checks and exit 0 immediately')
  .action(async (options) => {
    await runCommand(options)
  })

try {
  await program.parseAsync(process.argv)
} catch (err) {
  process.stderr.write(`pusherg: ${err.message}\n`)
  process.exit(1)
}
