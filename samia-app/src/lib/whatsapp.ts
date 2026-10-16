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

  constructor(private readonly open: (url: string) => unknown = (url) => window.open(url, '_blank', 'noopener')) {}

  send(message: OutgoingMessage): boolean {
    const result = this.open(buildWhatsAppLink(message.to_phone, message.body))
    return result !== null
  }
}

export const defaultSender: MessageSender = new WhatsAppClickToSend()
