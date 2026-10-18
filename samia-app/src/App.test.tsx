import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

// الاختبار ما بيعتمد على ملف .env المحلي: بنثبّت البيئة على "كل المتغيرات ناقصة"
// عشان التطبيق يفتح على صفحة التجهيز (/setup) بدل ما ينتظر Supabase.
vi.mock('./lib/env', async () => {
  const actual = await vi.importActual<typeof import('./lib/env')>('./lib/env')
  return { ...actual, env: actual.readEnv({}) }
})

describe('App', () => {
  it('بيفتح على الصفحة الرئيسية مع الاسم', () => {
    render(<App />)
    expect(screen.getAllByText('سامية يحيى').length).toBeGreaterThan(0)
  })
})
