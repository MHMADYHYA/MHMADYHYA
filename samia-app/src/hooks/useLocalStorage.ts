import { useCallback, useState } from 'react'

/** تفضيل بسيط بيتحفظ بالمتصفح (مثل آخر عرض للتقويم). بيتحمّل الأخطاء بصمت. */
export function useLocalStorage<T extends string>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return (stored as T | null) ?? initial
    } catch {
      return initial
    }
  })
  const update = useCallback(
    (next: T) => {
      setValue(next)
      try {
        window.localStorage.setItem(key, next)
      } catch {
        /* تجاهل */
      }
    },
    [key],
  )
  return [value, update]
}
