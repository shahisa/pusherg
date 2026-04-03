import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../src/detect.js', () => ({
  detectScripts: vi.fn(),
  detectPackageManager: vi.fn(),
}))
vi.mock('../src/runner.js', () => ({
  runScript: vi.fn(),
}))
vi.mock('../src/reporter.js', () => ({
  printResult: vi.fn(),
  printSummary: vi.fn(),
}))
vi.mock('../src/prompt.js', () => ({
  askPushAnyway: vi.fn(),
}))

import { detectScripts, detectPackageManager } from '../src/detect.js'
import { runScript } from '../src/runner.js'
import { printResult, printSummary } from '../src/reporter.js'
import { askPushAnyway } from '../src/prompt.js'
import { runCommand } from '../src/commands/run.js'

const makeResult = (name, passed) => ({
  name, passed, exitCode: passed ? 0 : 1,
  stdout: '', stderr: '', duration: 100,
})

describe('runCommand', () => {
  let exitSpy

  beforeEach(() => {
    vi.restoreAllMocks()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    detectPackageManager.mockResolvedValue('npm')
    detectScripts.mockResolvedValue(['build', 'test'])
  })

  it('--force exits 0 immediately without running scripts', async () => {
    await runCommand({ force: true }, { cwd: '/fake' })
    expect(exitSpy).toHaveBeenCalledWith(0)
    expect(detectScripts).not.toHaveBeenCalled()
  })

  it('exits 0 with message when no scripts detected', async () => {
    detectScripts.mockResolvedValue([])
    await runCommand({}, { cwd: '/fake' })
    expect(exitSpy).toHaveBeenCalledWith(0)
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('no scripts detected')
    )
  })

  it('calls runScript for each detected script', async () => {
    runScript.mockResolvedValue(makeResult('build', true))
    await runCommand({}, { cwd: '/fake' })
    expect(runScript).toHaveBeenCalledTimes(2)
    expect(runScript).toHaveBeenCalledWith('npm', 'build', { cwd: '/fake' })
    expect(runScript).toHaveBeenCalledWith('npm', 'test', { cwd: '/fake' })
  })

  it('runs all scripts even when one fails (no fail-fast)', async () => {
    runScript
      .mockResolvedValueOnce(makeResult('build', false))
      .mockResolvedValueOnce(makeResult('test', true))
    askPushAnyway.mockResolvedValue(false)
    await runCommand({}, { cwd: '/fake' })
    expect(runScript).toHaveBeenCalledTimes(2)
  })

  it('calls printResult for each script result', async () => {
    runScript.mockResolvedValue(makeResult('build', true))
    await runCommand({}, { cwd: '/fake' })
    expect(printResult).toHaveBeenCalledTimes(2)
  })

  it('calls printSummary after all scripts', async () => {
    runScript.mockResolvedValue(makeResult('build', true))
    await runCommand({}, { cwd: '/fake' })
    expect(printSummary).toHaveBeenCalledTimes(1)
    expect(printSummary).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'build' })])
    )
  })

  it('calls askPushAnyway when any script fails', async () => {
    runScript
      .mockResolvedValueOnce(makeResult('build', false))
      .mockResolvedValueOnce(makeResult('test', true))
    askPushAnyway.mockResolvedValue(false)
    await runCommand({}, { cwd: '/fake' })
    expect(askPushAnyway).toHaveBeenCalledTimes(1)
  })

  it('exits 0 without prompt when all scripts pass', async () => {
    runScript.mockResolvedValue(makeResult('build', true))
    await runCommand({}, { cwd: '/fake' })
    expect(askPushAnyway).not.toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('exits 0 when scripts fail but user says push anyway', async () => {
    runScript.mockResolvedValue(makeResult('build', false))
    askPushAnyway.mockResolvedValue(true)
    await runCommand({}, { cwd: '/fake' })
    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('exits 1 when scripts fail and user declines', async () => {
    runScript.mockResolvedValue(makeResult('build', false))
    askPushAnyway.mockResolvedValue(false)
    await runCommand({}, { cwd: '/fake' })
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
