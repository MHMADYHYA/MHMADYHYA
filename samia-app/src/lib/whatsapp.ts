/**
 * طريقة الإرسال كقطعة منفصلة (القسم 6): اليوم wa.me بكبسة من سامية،
 * وبالمستقبل ممكن نضيف إرسال تلقائي بدون ما نغيّر باقي الكود.
 */
export interface OutgoingMessage {
  to_phone: string
  body: string
}

export interface MessageSender {
  readonly id: string
  readonly label: string
  /** بيرجع true إذا الإرسال انطلق (مثلاً انفتح الواتساب) */
  send(message: OutgoingMessage): boolean
}

export function buildWhatsAppLink(phone: string, body: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`
}

export class WhatsAppClickToSend implements MessageSender {
  readonly id = 'whatsapp_click_to_send'
  readonly label = 'واتساب (بكبسة)'

  constructor(private readonly open: (url: string) => unknown = defaultOpen) {}

  send(message: OutgoingMessage): boolean {
    const result = this.open(buildWhatsAppLink(message.to_phone, message.body))
    return result !== null && result !== undefined
  }
}

/**
 * بيفتح الرابط بتبويب جديد. ما منستعمل 'noopener' بالخيارات لأنو وقتها window.open
 * بيرجع null دايماً (حسب المواصفة) وما منعرف إذا انفتح، فمنصفّر opener بإيدنا.
 */
function defaultOpen(url: string): Window | null {
  const win = window.open(url, '_blank')
  if (win) {
    try {
      win.opener = null
    } catch {
      /* بعض المتصفحات بتمنع الوصول */
    }
  }
  return win
}

export const defaultSender: MessageSender = new WhatsAppClickToSend()
