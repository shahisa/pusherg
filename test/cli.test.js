import { describe, it, expect } from 'vitest'
import { execa } from 'execa'

describe('CLI entry point', () => {
  it('shows help with --help flag', async () => {
    const result = await execa('node', ['bin/cli.js', '--help'], { reject: false })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('pusherg')
    expect(result.stdout).toContain('init')
    expect(result.stdout).toContain('run')
  })

  it('shows version with --version flag', async () => {
    const result = await execa('node', ['bin/cli.js', '--version'], { reject: false })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('0.1.0')
  })

  it('exits with error for unknown command', async () => {
    const result = await execa('node', ['bin/cli.js', 'unknown'], { reject: false })
    expect(result.exitCode).not.toBe(0)
  })
})
