import { describe, expect, it } from 'vitest'
import { readEnv } from './env'

describe('readEnv', () => {
  it('بيرجع كل المتغيرات كناقصة لما ما في إشي', () => {
    expect(readEnv({}).missing).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_PUBLIC_BASE_URL'])
  })

  it('بيقبل القيم الصحيحة وبيشيل / من آخر الروابط', () => {
    const result = readEnv({
      VITE_SUPABASE_URL: 'https://abc.supabase.co/',
      VITE_SUPABASE_ANON_KEY: '  key  ',
      VITE_PUBLIC_BASE_URL: 'http://localhost:5173/',
    })
    expect(result.missing).toEqual([])
    expect(result.supabaseUrl).toBe('https://abc.supabase.co')
    expect(result.supabaseAnonKey).toBe('key')
    expect(result.publicBaseUrl).toBe('http://localhost:5173')
  })

  it('رابط مش صالح بينحسب ناقص', () => {
    const result = readEnv({
      VITE_SUPABASE_URL: 'abc.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'key',
      VITE_PUBLIC_BASE_URL: 'http://localhost:5173',
    })
    expect(result.missing).toEqual(['VITE_SUPABASE_URL'])
  })
})
