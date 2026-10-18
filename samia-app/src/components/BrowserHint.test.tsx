import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initInstallPrompt, resetInstallPromptForTests } from '../lib/install'
import { BrowserHint } from './BrowserHint'

const SAMSUNG =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile Safari/537.36'
const CHROME = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

function fakeInstallEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  event.prompt = vi.fn(() => Promise.resolve())
  event.userChoice = Promise.resolve({ outcome })
  return event
}

beforeEach(() => {
  resetInstallPromptForTests()
  initInstallPrompt(window)
  try {
    sessionStorage.clear()
  } catch {
    // jsdom
  }
})

afterEach(() => {
  resetInstallPromptForTests()
})

describe('BrowserHint', () => {
  it('بمتصفح سامسونج: زر "افتحي بـ Chrome" برابط أندرويد لنفس الصفحة', () => {
    render(<BrowserHint userAgent={SAMSUNG} />)
    expect(screen.getByText(/التطبيق مفتوح بمتصفح سامسونج/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'افتحي بـ Chrome' })
    expect(link.getAttribute('href')).toMatch(/^intent:\/\/localhost(:\d+)?\/.*#Intent;scheme=http;package=com\.android\.chrome;/)
    expect(screen.queryByRole('button', { name: 'ثبّتي التطبيق' })).not.toBeInTheDocument()
  })

  it('بمتصفح سامسونج الاقتراح بيضل حتى لو في حدث تثبيت', () => {
    act(() => {
      window.dispatchEvent(fakeInstallEvent())
    })
    render(<BrowserHint userAgent={SAMSUNG} />)
    expect(screen.getByRole('link', { name: 'افتحي بـ Chrome' })).toBeInTheDocument()
  })

  it('بـ Chrome: ما في إشي لحد ما Chrome يجهّز التثبيت، وبعدها زر "ثبّتي التطبيق" بيفتح نافذة التثبيت', async () => {
    render(<BrowserHint userAgent={CHROME} />)
    expect(screen.queryByRole('button', { name: 'ثبّتي التطبيق' })).not.toBeInTheDocument()

    const event = fakeInstallEvent('accepted')
    act(() => {
      window.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true) // بدل شريط Chrome الصغير
    const button = screen.getByRole('button', { name: 'ثبّتي التطبيق' })
    fireEvent.click(button)
    await waitFor(() => expect(event.prompt).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'ثبّتي التطبيق' })).not.toBeInTheDocument())
  })

  it('"مش هلأ" بتخبّي زر التثبيت', () => {
    render(<BrowserHint userAgent={CHROME} />)
    act(() => {
      window.dispatchEvent(fakeInstallEvent())
    })
    fireEvent.click(screen.getByRole('button', { name: 'مش هلأ' }))
    expect(screen.queryByRole('button', { name: 'ثبّتي التطبيق' })).not.toBeInTheDocument()
  })

  it('على الآيفون والكمبيوتر ما بيطلع إشي', () => {
    const { container } = render(<BrowserHint userAgent={IPHONE} />)
    expect(container).toBeEmptyDOMElement()
  })
})
