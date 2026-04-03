import { detectScripts, detectPackageManager } from '../detect.js'
import { runScript } from '../runner.js'
import { printResult, printSummary } from '../reporter.js'
import { askPushAnyway } from '../prompt.js'

export async function runCommand(options, { cwd = process.cwd() } = {}) {
  if (options.force) {
    process.exit(0)
    return
  }

  const pm = await detectPackageManager(cwd)
  const scripts = await detectScripts(cwd)

  if (scripts.length === 0) {
    process.stderr.write('pusherg: no scripts detected — push allowed\n')
    process.exit(0)
    return
  }

  const results = []
  for (const script of scripts) {
    const result = await runScript(pm, script, { cwd })
    results.push(result)
    printResult(result)
  }

  printSummary(results)

  const anyFailed = results.some(r => !r.passed)
  if (!anyFailed) {
    process.exit(0)
    return
  }

  const pushAnyway = await askPushAnyway()
  process.exit(pushAnyway ? 0 : 1)
}
