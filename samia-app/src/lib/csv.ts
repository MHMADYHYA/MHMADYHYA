/** تصدير CSV بترميز UTF-8 مع BOM عشان Excel يقرأ العربي صح */
export interface CsvColumn<T> {
  key: keyof T | string
  label: string
  value?: (row: T) => unknown
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv<T extends object>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCell(c.value ? c.value(row) : (row as Record<string, unknown>)[c.key as string]))
      .join(','),
  )
  return '﻿' + [header, ...lines].join('\r\n') + '\r\n'
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
