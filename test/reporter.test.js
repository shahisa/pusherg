import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { printResult, printSummary } from '../src/reporter.js'

describe('printResult', () => {
  let stderrSpy
  let stdoutSpy

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes pass line to stderr with script name and duration', () => {
    printResult({ name: 'build', passed: true, duration: 100 })
    expect(stderrSpy).toHaveBeenCalled()
    const written = stderrSpy.mock.calls.map(c => c[0]).join('')
    expect(written).toContain('build')
    expect(written).toContain('100ms')
  })

  it('writes fail line to stderr with script name and duration', () => {
    printResult({ name: 'test', passed: false, duration: 200 })
    expect(stderrSpy).toHaveBeenCalled()
    const written = stderrSpy.mock.calls.map(c => c[0]).join('')
    expect(written).toContain('test')
    expect(written).toContain('200ms')
  })

  it('NEVER writes to stdout', () => {
    printResult({ name: 'lint', passed: true, duration: 50 })
    expect(stdoutSpy).not.toHaveBeenCalled()
  })
})

describe('printSummary', () => {
  let stderrSpy
  let stdoutSpy

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes "All checks passed" message when all results pass', () => {
    printSummary([
      { name: 'build', passed: true },
      { name: 'test', passed: true },
    ])
    const written = stderrSpy.mock.calls.map(c => c[0]).join('')
    expect(written).toContain('All checks passed')
  })

  it('writes failure count when some results fail', () => {
    printSummary([
      { name: 'build', passed: true },
      { name: 'test', passed: false },
    ])
    const written = stderrSpy.mock.calls.map(c => c[0]).join('')
    expect(written).toContain('1 check(s) failed')
  })

  it('NEVER writes to stdout', () => {
    printSummary([{ name: 'build', passed: true }])
    expect(stdoutSpy).not.toHaveBeenCalled()
  })
})
