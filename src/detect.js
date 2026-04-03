import { readFile } from 'fs/promises'
import { join } from 'path'

const KNOWN_SCRIPTS = ['build', 'test', 'lint', 'typecheck', 'type-check']

export async function detectScripts(cwd) {
  const raw = await readFile(join(cwd, 'package.json'), 'utf8')
  const pkg = JSON.parse(raw)
  const available = Object.keys(pkg.scripts || {})
  return KNOWN_SCRIPTS.filter(name => available.includes(name))
}

export async function detectPackageManager(cwd) {
  for (const [file, manager] of [['yarn.lock', 'yarn'], ['pnpm-lock.yaml', 'pnpm']]) {
    try {
      await readFile(join(cwd, file))
      return manager
    } catch {
      // file absent — try next
    }
  }
  return 'npm'
}
