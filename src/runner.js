import { execa } from 'execa'

export async function runScript(packageManager, scriptName, { cwd } = {}) {
  const start = Date.now()
  const proc = await execa(packageManager, ['run', scriptName], {
    reject: false,
    cwd,
    all: true,
  })
  return {
    name: scriptName,
    passed: proc.exitCode === 0,
    exitCode: proc.exitCode,
    stdout: proc.stdout ?? '',
    stderr: proc.stderr ?? '',
    duration: Date.now() - start,
  }
}
