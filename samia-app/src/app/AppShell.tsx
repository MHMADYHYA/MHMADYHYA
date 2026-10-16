import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { BrandLockup } from '../components/BrandLockup'
import { ButterflyMark } from '../components/ButterflyMark'
import { CountBadge } from '../components/Controls'
import { CalendarIcon, CoinsIcon, FlagIcon, MessageIcon, PlusIcon, SettingsIcon, UsersIcon } from '../components/Icons'
import { useBadgeCounts } from '../hooks/useBadgeCounts'
import { useRealtimeInvalidation } from '../hooks/queries'
import { useNow } from '../hooks/useNow'
import { formatDayAndDate, greetingFor } from '../lib/dates'

const NAV = [
  { to: '/calendar', label: 'التقويم', icon: CalendarIcon, badge: 'none' },
  { to: '/messages', label: 'الرسائل', icon: MessageIcon, badge: 'messages' },
  { to: '/follow-up', label: 'المتابعة', icon: FlagIcon, badge: 'followUp' },
  { to: '/payments', label: 'الدفعات', icon: CoinsIcon, badge: 'payments' },
  { to: '/clients', label: 'الزبائن', icon: UsersIcon, badge: 'none' },
] as const

/** الهيكل العام: هيدر مع التحية والترس، المحتوى، شريط تنقل تحت، وزر + عائم */
export function AppShell() {
  const now = useNow()
  const location = useLocation()
  const navigate = useNavigate()
  const counts = useBadgeCounts(now)
  useRealtimeInvalidation(true)

  const isCalendarHome = location.pathname === '/calendar' || location.pathname === '/'
  const hideFab = location.pathname.startsWith('/appointments/new') || location.pathname.startsWith('/settings')

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          {isCalendarHome ? (
            <div className="flex items-center gap-2.5">
              <ButterflyMark size={30} />
              <div className="leading-tight">
                <p className="text-lg font-semibold">{greetingFor(now)}</p>
                <p className="text-xs text-muted">{formatDayAndDate(now)}</p>
              </div>
            </div>
          ) : (
            <BrandLockup />
          )}
          <NavLink
            to="/settings"
            aria-label="الإعدادات"
            className={({ isActive }) =>
              `flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-page-tint hover:text-ink'
              }`
            }
          >
            <SettingsIcon />
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      {!hideFab && (
        <button
          type="button"
          onClick={() => navigate('/appointments/new')}
          aria-label="موعد جديد"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] end-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-raised transition-transform hover:bg-[#1A4252] active:scale-95"
        >
          <PlusIcon width="26" height="26" />
        </button>
      )}

      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon
            const count = item.badge === 'none' ? 0 : counts[item.badge]
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                      isActive ? 'text-primary' : 'text-muted hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`relative rounded-full px-3 py-1 ${isActive ? 'bg-primary-soft' : ''}`}>
                        <Icon width="22" height="22" />
                        <CountBadge count={count} className="absolute -top-1 -end-2" />
                      </span>
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
