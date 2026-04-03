import { describe, it, expect } from 'vitest'
import { runScript } from '../src/runner.js'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function makeTmpProject(scriptName, scriptCommand) {
  const dir = mkdtempSync(join(tmpdir(), 'pusherg-test-'))
  const pkg = {
    name: 'test-project',
    version: '1.0.0',
    scripts: {
      [scriptName]: scriptCommand,
    },
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2))
  return dir
}

describe('runScript', () => {
  it('returns passed:true and exitCode:0 for a successful command', async () => {
    const cwd = makeTmpProject('test', 'node -e "process.exit(0)"')
    const result = await runScript('npm', 'test', { cwd })
    expect(result.passed).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.name).toBe('test')
  })

  it('returns passed:false and exitCode:1 for a failing command — does NOT throw', async () => {
    const cwd = makeTmpProject('test', 'node -e "process.exit(1)"')
    const result = await runScript('npm', 'test', { cwd })
    expect(result.passed).toBe(false)
    expect(result.exitCode).toBe(1)
  })

  it('captures stdout from the script', async () => {
    const cwd = makeTmpProject('build', 'node -e "process.stdout.write(\'hello world\')"')
    const result = await runScript('npm', 'build', { cwd })
    expect(result.stdout).toContain('hello world')
  })

  it('captures stderr from the script', async () => {
    const cwd = makeTmpProject('lint', 'node -e "process.stderr.write(\'error output\')"')
    const result = await runScript('npm', 'lint', { cwd })
    expect(result.stderr).toContain('error output')
  })

  it('duration is a positive number', async () => {
    const cwd = makeTmpProject('test', 'node -e "process.exit(0)"')
    const result = await runScript('npm', 'test', { cwd })
    expect(typeof result.duration).toBe('number')
    expect(result.duration).toBeGreaterThan(0)
  })

  it('result contains all required fields', async () => {
    const cwd = makeTmpProject('build', 'node -e "process.exit(0)"')
    const result = await runScript('npm', 'build', { cwd })
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('passed')
    expect(result).toHaveProperty('exitCode')
    expect(result).toHaveProperty('stdout')
    expect(result).toHaveProperty('stderr')
    expect(result).toHaveProperty('duration')
  })
})
