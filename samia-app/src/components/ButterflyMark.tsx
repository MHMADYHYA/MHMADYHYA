/**
 * فراشة القلبين: الجناحين قلبين بلونين (المعالجة والشخص اللي بتساعده)،
 * ومع بعض بيعملوا فراشة. نسخة SVG مضمّنة من assets/logo-mark.svg.
 */
const HEART_PATH =
  'M0 40 C-30 20 -40 0 -40 -14 C-40 -30 -24 -38 -12 -34 C-6 -32 -2 -28 0 -22 C2 -28 6 -32 12 -34 C24 -38 40 -30 40 -14 C40 0 30 20 0 40 Z'

interface ButterflyMarkProps {
  /** الحجم بالبكسل (مربّع) */
  size?: number
  /** color: الألوان الأصلية. white: أبيض على خلفية غامقة */
  tone?: 'color' | 'white'
  className?: string
  title?: string
}

export function ButterflyMark({
  size = 40,
  tone = 'color',
  className,
  title = 'شعار سامية يحيى: فراشة جناحيها قلبين',
}: ButterflyMarkProps) {
  const colors =
    tone === 'white'
      ? { rightWing: '#FFFFFF', leftWing: '#F4A88F', body: '#FFFFFF' }
      : { rightWing: '#1F4E5F', leftWing: '#E07A5F', body: '#1C2B33' }

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <g transform="translate(0 6)">
        <g transform="translate(87 55) rotate(62) scale(0.64)">
          <path d={HEART_PATH} fill={colors.rightWing} />
        </g>
        <g transform="translate(33 55) rotate(-62) scale(0.64)">
          <path d={HEART_PATH} fill={colors.leftWing} />
        </g>
        <path d="M60 54 V80" fill="none" stroke={colors.body} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M59 54 Q56 42 50 37" fill="none" stroke={colors.body} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M61 54 Q64 42 70 37" fill="none" stroke={colors.body} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="50" cy="37" r="1.9" fill={colors.body} />
        <circle cx="70" cy="37" r="1.9" fill={colors.body} />
      </g>
    </svg>
  )
}
