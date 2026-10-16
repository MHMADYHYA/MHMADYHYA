import { useEffect, useState } from 'react'

/** الوقت الحالي، بيتحدث كل دقيقة (عشان "اليوم"، التذكيرات، الأزرار حسب الوقت) */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
