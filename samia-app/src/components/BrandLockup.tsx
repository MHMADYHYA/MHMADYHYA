import { ButterflyMark } from './ButterflyMark'

export const BRAND_NAME = 'سامية يحيى'
export const BRAND_TAGLINE = 'عاملة اجتماعية ومعالجة'

interface BrandLockupProps {
  /** sm للهيدر، lg لصفحة الدخول وصفحة الزبون */
  size?: 'sm' | 'lg'
}

/**
 * القفل: الرمز على اليمين، خط فاصل رفيع، وعلى اليسار الاسم وتحته الوصف.
 * مبني HTML/CSS (مش صورة) عشان الخط يضل واضح.
 */
export function BrandLockup({ size = 'sm' }: BrandLockupProps) {
  const markSize = size === 'lg' ? 64 : 44
  return (
    <div className="flex items-center gap-3">
      <ButterflyMark size={markSize} />
      <span aria-hidden="true" className={`w-px bg-border ${size === 'lg' ? 'h-14' : 'h-10'}`} />
      <div className="leading-tight">
        <p className={`font-semibold text-ink ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>{BRAND_NAME}</p>
        <p className={`font-normal text-muted ${size === 'lg' ? 'text-base' : 'text-sm'}`}>{BRAND_TAGLINE}</p>
      </div>
    </div>
  )
}
