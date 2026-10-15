import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('بيفتح على الصفحة الرئيسية مع الاسم', () => {
    render(<App />)
    expect(screen.getAllByText('سامية يحيى').length).toBeGreaterThan(0)
  })
})
