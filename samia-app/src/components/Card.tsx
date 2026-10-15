import type { HTMLAttributes } from 'react'

/** بطاقة بزوايا ناعمة، بدون حدود جانبية ملوّنة */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-border bg-surface p-4 md:p-5 ${className}`} {...props} />
}
