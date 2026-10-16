/** صفحة "بدها متابعة" (القسم 12): أربع أنواع من العناصر */
import type { FollowUpSource } from './api'
import type { SettingsRow } from './database.types'
import { needsAttendanceMark } from './transitions'

export type FollowUpKind = 'no_response' | 'change_requested' | 'declined' | 'unmarked'

export interface FollowUpItem {
  kind: FollowUpKind
  appointment: FollowUpSource
  /** متى انبعتت الدعوة (لنوع ما رد) */
  inviteSentAt: string | null
}

export const FOLLOW_UP_LABELS: Record<FollowUpKind, string> = {
  no_response: 'ما رد على الدعوة',
  change_requested: 'طلب تغيير',
  declined: 'ما بقدر يجي',
  unmarked: 'مرق وقته وما انعلّم',
}

export function buildFollowUpItems(
  source: FollowUpSource[],
  settings: Pick<SettingsRow, 'follow_up_after_hours'>,
  now: Date,
): FollowUpItem[] {
  const items: FollowUpItem[] = []
  const thresholdMs = settings.follow_up_after_hours * 60 * 60_000
  for (const a of source) {
    const inviteSentAt =
      a.outbox_messages
        .filter((m) => m.recipient === 'client' && (m.kind === 'invite' || m.kind === 'change') && m.sent_at)
        .map((m) => m.sent_at as string)
        .sort()
        .at(-1) ?? null

    if (needsAttendanceMark(a, now)) {
      items.push({ kind: 'unmarked', appointment: a, inviteSentAt })
      continue
    }
    if (new Date(a.starts_at).getTime() <= now.getTime()) continue

    if (a.status === 'change_requested') {
      items.push({ kind: 'change_requested', appointment: a, inviteSentAt })
    } else if (a.status === 'declined') {
      items.push({ kind: 'declined', appointment: a, inviteSentAt })
    } else if (a.status === 'pending' && inviteSentAt && now.getTime() - new Date(inviteSentAt).getTime() >= thresholdMs) {
      items.push({ kind: 'no_response', appointment: a, inviteSentAt })
    }
  }
  const order: FollowUpKind[] = ['change_requested', 'no_response', 'declined', 'unmarked']
  return items.sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind))
}
