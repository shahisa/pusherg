import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtemp, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectScripts, detectPackageManager } from '../src/detect.js'

describe('detectScripts', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
  })

  it('returns only known scripts present in package.json', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { build: 'tsc', test: 'vitest' } })
    )
    const scripts = await detectScripts(tmpDir)
    expect(scripts).toEqual(['build', 'test'])
  })

  it('silently skips absent scripts (DETECT-02)', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { build: 'tsc' } })
    )
    const scripts = await detectScripts(tmpDir)
    expect(scripts).not.toContain('test')
    expect(scripts).not.toContain('lint')
  })

  it('returns empty array when no known scripts exist', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { start: 'node .' } })
    )
    const scripts = await detectScripts(tmpDir)
    expect(scripts).toEqual([])
  })

  it('returns empty array when scripts field is missing', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({})
    )
    const scripts = await detectScripts(tmpDir)
    expect(scripts).toEqual([])
  })

  it('detects all known script names including typecheck variants', async () => {
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          build: 'tsc',
          test: 'vitest',
          lint: 'eslint .',
          typecheck: 'tsc --noEmit',
          'type-check': 'tsc --noEmit',
        },
      })
    )
    const scripts = await detectScripts(tmpDir)
    expect(scripts).toContain('build')
    expect(scripts).toContain('test')
    expect(scripts).toContain('lint')
    expect(scripts).toContain('typecheck')
    expect(scripts).toContain('type-check')
    expect(scripts).toHaveLength(5)
  })
})

describe('detectPackageManager', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-pm-test-'))
  })

  it('returns yarn when yarn.lock present (SETUP-02)', async () => {
    await writeFile(join(tmpDir, 'yarn.lock'), '')
    expect(await detectPackageManager(tmpDir)).toBe('yarn')
  })

  it('returns pnpm when pnpm-lock.yaml present (SETUP-02)', async () => {
    await writeFile(join(tmpDir, 'pnpm-lock.yaml'), '')
    expect(await detectPackageManager(tmpDir)).toBe('pnpm')
  })

  it('defaults to npm when no lockfile found (SETUP-02)', async () => {
    expect(await detectPackageManager(tmpDir)).toBe('npm')
  })

  it('yarn.lock takes priority over pnpm-lock.yaml', async () => {
    await writeFile(join(tmpDir, 'yarn.lock'), '')
    await writeFile(join(tmpDir, 'pnpm-lock.yaml'), '')
    expect(await detectPackageManager(tmpDir)).toBe('yarn')
  })
})
