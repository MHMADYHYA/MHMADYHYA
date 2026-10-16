import { useCallback } from 'react'
import { useToast } from '../../components/Feedback'
import type { OutboxMessageRow } from '../../lib/database.types'
import { toArabicError } from '../../lib/errors'
import { defaultSender, type MessageSender } from '../../lib/whatsapp'
import { useUpdateMessage } from '../../hooks/queries'

type Msg = Pick<OutboxMessageRow, 'id' | 'to_phone' | 'body'>

/**
 * إرسال رسالة بكبسة: بيفتح الواتساب، بيسجّل sent_at، وبيعرض "تراجع" لكم ثانية.
 * طريقة الإرسال نفسها قطعة منفصلة (MessageSender).
 */
export function useSendMessage(sender: MessageSender = defaultSender) {
  const toast = useToast()
  const update = useUpdateMessage()

  const unsend = useCallback(
    async (id: string) => {
      try {
        await update.mutateAsync({ id, patch: { sent_at: null, skipped_at: null } })
        toast({ message: 'رجّعناها لغير مبعوتة.' })
      } catch (err) {
        toast({ message: toArabicError(err), variant: 'error' })
      }
    },
    [update, toast],
  )

  const send = useCallback(
    async (message: Msg) => {
      const opened = sender.send({ to_phone: message.to_phone, body: message.body })
      if (!opened) {
        toast({ message: 'المتصفح منع فتح الواتساب. اسمح بالنوافذ المنبثقة وجرّب مرة ثانية.', variant: 'error' })
        return
      }
      try {
        await update.mutateAsync({ id: message.id, patch: { sent_at: new Date().toISOString() } })
        toast({
          message: 'انفتح الواتساب والرسالة جاهزة. علّمناها كمبعوتة.',
          action: { label: 'تراجع', onClick: () => void unsend(message.id) },
        })
      } catch (err) {
        toast({ message: toArabicError(err), variant: 'error' })
      }
    },
    [sender, update, toast, unsend],
  )

  const markSent = useCallback(
    async (id: string) => {
      try {
        await update.mutateAsync({ id, patch: { sent_at: new Date().toISOString() } })
        toast({ message: 'علّمناها كمبعوتة.', action: { label: 'تراجع', onClick: () => void unsend(id) } })
      } catch (err) {
        toast({ message: toArabicError(err), variant: 'error' })
      }
    },
    [update, toast, unsend],
  )

  const skip = useCallback(
    async (id: string) => {
      try {
        await update.mutateAsync({ id, patch: { skipped_at: new Date().toISOString() } })
        toast({ message: 'تخطّينا الرسالة.', action: { label: 'تراجع', onClick: () => void unsend(id) } })
      } catch (err) {
        toast({ message: toArabicError(err), variant: 'error' })
      }
    },
    [update, toast, unsend],
  )

  return { send, markSent, skip, unsend, busy: update.isPending }
}
