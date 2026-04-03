import { describe, it, expect, vi, afterEach } from 'vitest'
import { askPushAnyway } from '../src/prompt.js'

// vi.mock is hoisted — must be at module level with factory, not inside test body
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('askPushAnyway', () => {
  it('returns false without prompting when not a TTY (isTTY is undefined)', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: undefined,
      configurable: true,
    })
    const result = await askPushAnyway()
    expect(result).toBe(false)
  })

  it('returns false without prompting when isTTY is false', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    })
    const result = await askPushAnyway()
    expect(result).toBe(false)
  })

  it('does not call confirm when not a TTY', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    })
    const { confirm } = await import('@inquirer/prompts')
    await askPushAnyway()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('calls confirm with correct options when TTY is available', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    })
    const { confirm } = await import('@inquirer/prompts')
    vi.mocked(confirm).mockResolvedValue(true)
    const result = await askPushAnyway()
    expect(confirm).toHaveBeenCalledWith({ message: 'Push anyway?', default: false })
    expect(result).toBe(true)
  })
})
