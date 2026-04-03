import { writeFile, chmod, access, mkdir } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const TEMPLATE = readFileSync(join(__dirname, '../../templates/pre-push'), 'utf8')

export async function initCommand({ cwd = process.cwd() } = {}) {
  try {
    await access(join(cwd, '.git'))
  } catch {
    process.stderr.write('pusherg: not a git repository (no .git directory found)\n')
    process.exit(1)
    return
  }

  const hooksDir = join(cwd, '.git', 'hooks')
  await mkdir(hooksDir, { recursive: true })

  const hookPath = join(hooksDir, 'pre-push')
  await writeFile(hookPath, TEMPLATE, 'utf8')
  await chmod(hookPath, 0o755)

  process.stderr.write('pusherg: pre-push hook installed successfully\n')
}
