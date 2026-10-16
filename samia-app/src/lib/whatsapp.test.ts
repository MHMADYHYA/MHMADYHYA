import { describe, expect, it, vi } from 'vitest'
import { WhatsAppClickToSend, buildWhatsAppLink } from './whatsapp'

describe('واتساب بكبسة', () => {
  it('الرابط بصيغة wa.me مع النص مشفّر', () => {
    const link = buildWhatsAppLink('972501234567', 'مرحبا ليلى،\nجلستك بكرا')
    expect(link).toBe('https://wa.me/972501234567?text=' + encodeURIComponent('مرحبا ليلى،\nجلستك بكرا'))
    expect(link).toContain('%0A')
  })

  it('المرسل بيفتح الرابط وبيرجع true', () => {
    const open = vi.fn().mockReturnValue({})
    const sender = new WhatsAppClickToSend(open)
    expect(sender.send({ to_phone: '972501234567', body: 'نص' })).toBe(true)
    expect(open).toHaveBeenCalledWith('https://wa.me/972501234567?text=%D9%86%D8%B5')
  })

  it('إذا المتصفح منع النافذة بيرجع false', () => {
    const sender = new WhatsAppClickToSend(() => null)
    expect(sender.send({ to_phone: '972501234567', body: 'نص' })).toBe(false)
  })
})
