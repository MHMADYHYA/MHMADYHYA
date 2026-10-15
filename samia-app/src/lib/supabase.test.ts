import { describe, expect, it, vi } from 'vitest'
import { checkSupabaseHealth } from './supabase'

describe('checkSupabaseHealth', () => {
  it('بيرجع نجاح لما الرد 200 وبيستعمل الرابط والمفتاح', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    const result = await checkSupabaseHealth('https://abc.supabase.co/', 'anon-key', fetchMock)
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://abc.supabase.co/auth/v1/health',
      expect.objectContaining({ headers: { apikey: 'anon-key' } }),
    )
  })

  it('401 معناها المفتاح مرفوض', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 401 }))
    const result = await checkSupabaseHealth('https://abc.supabase.co', 'bad', fetchMock)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('المفتاح')
  })

  it('فشل الشبكة بيرجع رسالة واضحة بدون ما يطيح', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'))
    const result = await checkSupabaseHealth('https://abc.supabase.co', 'k', fetchMock)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('ما قدرنا نوصل')
  })

  it('قيم فاضية ما بتعمل أي طلب', async () => {
    const fetchMock = vi.fn()
    const result = await checkSupabaseHealth('', '', fetchMock)
    expect(result.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
