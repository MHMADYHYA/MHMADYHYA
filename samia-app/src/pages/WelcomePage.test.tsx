import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { STATUS_LABELS } from '../lib/status'
import { WelcomePage } from './WelcomePage'

// الاختبار ما بيعتمد على ملف .env المحلي: بنثبّت البيئة على "كل المتغيرات ناقصة"
vi.mock('../lib/env', async () => {
  const actual = await vi.importActual<typeof import('../lib/env')>('../lib/env')
  return { ...actual, env: actual.readEnv({}) }
})

describe('WelcomePage (المرحلة 0)', () => {
  it('بتعرض التحية والتاريخ بتوقيت القدس', () => {
    render(<WelcomePage now={new Date('2026-10-20T05:00:00Z')} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('صباح الخير، سامية')
    expect(screen.getByText('الثلاثاء 20/10/2026')).toBeInTheDocument()
  })

  it('بتعرض اللوجو والاسم والألوان وحالات الموعد', () => {
    render(<WelcomePage />)
    expect(screen.getAllByText('سامية يحيى').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'الألوان' })).toBeInTheDocument()
    expect(screen.getByText('#1F4E5F')).toBeInTheDocument()
    for (const label of Object.values(STATUS_LABELS)) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('بتبيّن المتغيرات الناقصة لما ما في ملف .env', () => {
    render(<WelcomePage />)
    expect(screen.getAllByText('ناقص')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /جرّب الاتصال/ })).toBeDisabled()
  })
})
