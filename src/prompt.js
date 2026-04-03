import { confirm } from '@inquirer/prompts'

export async function askPushAnyway() {
  if (!process.stdin.isTTY) {
    return false
  }
  return confirm({ message: 'Push anyway?', default: false })
}
