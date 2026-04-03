import chalk from 'chalk'

export function printResult(result) {
  const icon = result.passed ? chalk.green('\u2713') : chalk.red('\u2717')
  process.stderr.write(`  ${icon} ${result.name} (${result.duration}ms)\n`)
}

export function printSummary(results) {
  const failed = results.filter(r => !r.passed)
  if (failed.length === 0) {
    process.stderr.write(chalk.green('\nAll checks passed.\n'))
  } else {
    process.stderr.write(chalk.red(`\n${failed.length} check(s) failed.\n`))
  }
}
