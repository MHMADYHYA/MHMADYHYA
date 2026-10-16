import { useMemo } from 'react'
import { buildFollowUpItems } from '../lib/followup'
import { unpaidAppointments } from '../lib/payments'
import { reminderApplies } from '../lib/transitions'
import { useFollowUpSource, useOutbox, usePayable, useSettings } from './queries'

export interface BadgeCounts {
  messages: number
  followUp: number
  payments: number
}

/** الأرقام على شريط التنقل: رسائل وقتها إجا، بدها متابعة، جلسات ما اندفعت */
export function useBadgeCounts(now: Date): BadgeCounts {
  const outbox = useOutbox(now)
  const followUp = useFollowUpSource(now)
  const settings = useSettings()
  const since = useMemo(() => new Date(now.getFullYear() - 1, now.getMonth(), 1), [now])
  const payable = usePayable(since)

  return useMemo(() => {
    const nowMs = now.getTime()
    const messages = (outbox.data?.pending ?? []).filter((m) => {
      if (new Date(m.due_at).getTime() > nowMs) return false
      if (m.kind === 'reminder_day' || m.kind === 'reminder_hour') return reminderApplies(m.appointments.status)
      return true
    }).length
    const followUpCount = settings.data && followUp.data ? buildFollowUpItems(followUp.data, settings.data, now).length : 0
    const payments = payable.data ? unpaidAppointments(payable.data).length : 0
    return { messages, followUp: followUpCount, payments }
  }, [outbox.data, followUp.data, settings.data, payable.data, now])
}
