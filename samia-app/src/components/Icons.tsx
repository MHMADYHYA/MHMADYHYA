import type { SVGProps } from 'react'

/** أيقونات خطية بسماكة 1.8 وأطراف مدوّرة، نفس الستايل بكل التطبيق. بدون إيموجي. */
export type IconProps = SVGProps<SVGSVGElement>

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const CheckCircleIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.3 2.3 4.7-5" />
  </IconBase>
)
export const AlertCircleIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4.5" />
    <circle cx="12" cy="16" r="0.6" fill="currentColor" />
  </IconBase>
)
export const InfoIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r="0.6" fill="currentColor" />
  </IconBase>
)
export const LockIcon = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </IconBase>
)
export const SettingsIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    <circle cx="12" cy="12" r="7" />
  </IconBase>
)
export const CalendarIcon = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </IconBase>
)
export const MessageIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.1-4.2A8.5 8.5 0 1 1 20.5 12z" />
    <path d="M8.5 11h7M8.5 14h4.5" />
  </IconBase>
)
export const FlagIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 21V4.5" />
    <path d="M5 5h12.5l-2.5 4 2.5 4H5" />
  </IconBase>
)
export const CoinsIcon = (p: IconProps) => (
  <IconBase {...p}>
    <ellipse cx="10" cy="7" rx="6.5" ry="2.8" />
    <path d="M3.5 7v4.5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8V7" />
    <path d="M3.5 11.5V16c0 1.5 2.9 2.8 6.5 2.8 1 0 2-.1 2.8-.3" />
    <ellipse cx="16.5" cy="15.5" rx="4" ry="1.8" />
    <path d="M12.5 15.5v3c0 1 1.8 1.8 4 1.8s4-.8 4-1.8v-3" />
  </IconBase>
)
export const UsersIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="9.5" cy="8" r="3.5" />
    <path d="M3 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <path d="M16 5a3 3 0 0 1 0 6M21 19c0-2.6-1.6-4.6-4-5.3" />
  </IconBase>
)
export const UserIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.5c0-3.9 3.4-6.5 7.5-6.5s7.5 2.6 7.5 6.5" />
  </IconBase>
)
export const PlusIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 5v14M5 12h14" />
  </IconBase>
)
export const CopyIcon = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
  </IconBase>
)
export const ExternalLinkIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M19 14v4.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-11A1.5 1.5 0 0 1 6.5 6H11" />
  </IconBase>
)
export const SendIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M20 4L4 10.5l7 2.5 2.5 7L20 4z" />
    <path d="M11 13l9-9" />
  </IconBase>
)
export const CheckIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </IconBase>
)
export const XIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </IconBase>
)
export const ChevronRightIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M9.5 6l6 6-6 6" />
  </IconBase>
)
export const ChevronLeftIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M14.5 6l-6 6 6 6" />
  </IconBase>
)
export const ChevronDownIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </IconBase>
)
export const SearchIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </IconBase>
)
export const ClockIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </IconBase>
)
export const PhoneIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z" />
  </IconBase>
)
export const VideoIcon = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3" y="6.5" width="13" height="11" rx="2.5" />
    <path d="M16 10.5l5-2.5v8l-5-2.5" />
  </IconBase>
)
export const EditIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M13.5 8.5l2 2" />
  </IconBase>
)
export const UndoIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </IconBase>
)
export const SkipIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 5l9 7-9 7V5z" />
    <path d="M18 5v14" />
  </IconBase>
)
export const BellIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </IconBase>
)
export const DownloadIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4.5 17.5v1A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-1" />
  </IconBase>
)
export const LogoutIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10" />
    <path d="M14 8l4 4-4 4M18 12H9" />
  </IconBase>
)
export const SunIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </IconBase>
)
export const NoteIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6 3.5h8.5L19 8v12.5H6z" />
    <path d="M14.5 3.5V8H19M9 12.5h6M9 16h4" />
  </IconBase>
)
export const RefreshIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M20 12a8 8 0 0 1-14.5 4.6M4 12a8 8 0 0 1 14.5-4.6" />
    <path d="M18.5 3.5v4h-4M5.5 20.5v-4h4" />
  </IconBase>
)
export const ArrowStartIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M9 6l6 6-6 6" />
  </IconBase>
)
export const KeyIcon = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="8" cy="14" r="4" />
    <path d="M11 11l9-7M16 6.5l2 2M13.5 8.5l2 2" />
  </IconBase>
)
export const ShareIcon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" />
  </IconBase>
)
