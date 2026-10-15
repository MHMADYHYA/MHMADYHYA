import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandLockup } from './BrandLockup'

describe('BrandLockup', () => {
  it('بيعرض الاسم والوصف والرمز', () => {
    render(<BrandLockup />)
    expect(screen.getByText('سامية يحيى')).toBeInTheDocument()
    expect(screen.getByText('عاملة اجتماعية ومعالجة')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /فراشة/ })).toBeInTheDocument()
  })
})
