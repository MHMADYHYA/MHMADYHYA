/** نوع الجلسة (زوم / وجاهي) ومكانها */
import type { SessionType } from './database.types'
import { AppError } from './errors'

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  zoom: 'زوم',
  in_person: 'وجاهي',
}

export const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: 'zoom', label: 'زوم' },
  { value: 'in_person', label: 'وجاهي' },
]

/** رابط بيفتح العنوان بخرائط Google (على أندرويد بيفتح التطبيق) */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
}

/** النوع والعنوان بعد التحقق: الوجاهي لازم يكون إله عنوان، والزوم ما إله عنوان */
export function resolvePlace(
  sessionType: SessionType | undefined,
  location: string | null | undefined,
): { session_type: SessionType; location: string | null } {
  const type: SessionType = sessionType === 'in_person' ? 'in_person' : 'zoom'
  if (type === 'zoom') return { session_type: 'zoom', location: null }
  const address = (location ?? '').trim()
  if (!address) throw new AppError('اكتبي عنوان الجلسة الوجاهية (أو احفظي عنوان العيادة بالإعدادات)')
  return { session_type: 'in_person', location: address }
}
