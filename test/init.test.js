import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, readFile, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { initCommand } from '../src/commands/init.js'

describe('initCommand', () => {
  let exitSpy
  let stderrSpy

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes hook file to .git/hooks/pre-push', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
    await mkdir(join(tmpDir, '.git', 'hooks'), { recursive: true })
    await initCommand({ cwd: tmpDir })
    const content = await readFile(join(tmpDir, '.git', 'hooks', 'pre-push'), 'utf8')
    expect(content).toBeTruthy()
  })

  it('sets executable permissions (0o755)', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
    await mkdir(join(tmpDir, '.git', 'hooks'), { recursive: true })
    await initCommand({ cwd: tmpDir })
    const st = await stat(join(tmpDir, '.git', 'hooks', 'pre-push'))
    expect(st.mode & 0o777).toBe(0o755)
  })

  it('hook contains #!/bin/sh shebang', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
    await mkdir(join(tmpDir, '.git', 'hooks'), { recursive: true })
    await initCommand({ cwd: tmpDir })
    const content = await readFile(join(tmpDir, '.git', 'hooks', 'pre-push'), 'utf8')
    expect(content.startsWith('#!/bin/sh')).toBe(true)
  })

  it('hook contains exec < /dev/tty for TTY fix', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
    await mkdir(join(tmpDir, '.git', 'hooks'), { recursive: true })
    await initCommand({ cwd: tmpDir })
    const content = await readFile(join(tmpDir, '.git', 'hooks', 'pre-push'), 'utf8')
    expect(content).toContain('exec < /dev/tty')
  })

  it('hook contains npx pusherg run', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
    await mkdir(join(tmpDir, '.git', 'hooks'), { recursive: true })
    await initCommand({ cwd: tmpDir })
    const content = await readFile(join(tmpDir, '.git', 'hooks', 'pre-push'), 'utf8')
    expect(content).toContain('npx pusherg run')
  })

  it('hook contains TTY guard [ -t 1 ] before exec line', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
    await mkdir(join(tmpDir, '.git', 'hooks'), { recursive: true })
    await initCommand({ cwd: tmpDir })
    const content = await readFile(join(tmpDir, '.git', 'hooks', 'pre-push'), 'utf8')
    expect(content).toContain('[ -t 1 ]')
  })

  it('exits with error when not a git repo', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
    await initCommand({ cwd: tmpDir })
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('not a git repository')
    )
  })

  it('creates .git/hooks/ directory if missing', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'pusherg-test-'))
    await mkdir(join(tmpDir, '.git'), { recursive: true })
    // No hooks dir created — initCommand should create it
    await initCommand({ cwd: tmpDir })
    const content = await readFile(join(tmpDir, '.git', 'hooks', 'pre-push'), 'utf8')
    expect(content).toContain('npx pusherg run')
  })
})
