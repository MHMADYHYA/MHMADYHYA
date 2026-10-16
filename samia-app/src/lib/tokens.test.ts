import { describe, expect, it } from 'vitest'
import { generatePublicToken } from './tokens'

describe('generatePublicToken', () => {
  it('43 حرف base64url بدون = أو + أو /', () => {
    const token = generatePublicToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('كل مرة مختلف', () => {
    expect(generatePublicToken()).not.toBe(generatePublicToken())
  })

  it('بيحوّل + و / لـ - و _', () => {
    const token = generatePublicToken(() => new Uint8Array(32).fill(0xfb))
    expect(token).not.toMatch(/[+/=]/)
    expect(token.length).toBe(43)
  })
})
