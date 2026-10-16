import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AppointmentRow } from '../../components/AppointmentRow'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { InfoRow, PageTitle } from '../../components/Controls'
import { EmptyState, ErrorNotice, Spinner, useToast } from '../../components/Feedback'
import { ChevronRightIcon, CoinsIcon, PhoneIcon, PlusIcon, UserIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useClient, useClientAppointments, useUpdateClient } from '../../hooks/queries'
import { useNow } from '../../hooks/useNow'
import { formatShortDayDate } from '../../lib/dates'
import { toArabicError } from '../../lib/errors'
import { formatMoney, outstandingTotal } from '../../lib/payments'
import { formatPhoneForDisplay } from '../../lib/phone'
import { ClientForm } from './ClientForm'

export function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const now = useNow()
  const navigate = useNavigate()
  const toast = useToast()
  const client = useClient(id)
  const appointments = useClientAppointments(id)
  const update = useUpdateClient()
  const [editing, setEditing] = useState(false)

  const { upcoming, past, outstanding } = useMemo(() => {
    const list = appointments.data ?? []
    const nowMs = now.getTime()
    return {
      upcoming: list.filter((a) => new Date(a.starts_at).getTime() > nowMs).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      past: list.filter((a) => new Date(a.starts_at).getTime() <= nowMs),
      outstanding: outstandingTotal(list),
    }
  }, [appointments.data, now])

  if (client.isPending) return <Spinner />
  if (client.isError || !client.data) return <ErrorNotice message={client.error ? (client.error as Error).message : 'الزبون مش موجود'} />
  const c = client.data

  return (
    <div className="space-y-4">
      <Link to="/clients" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary">
        <ChevronRightIcon width="18" height="18" />
        كل الزبائن
      </Link>
      <PageTitle
        title={c.full_name}
        subtitle={c.archived ? 'مؤرشف' : undefined}
        action={
          <Button variant="secondary" onClick={() => setEditing(true)}>
            تعديل
          </Button>
        }
      />

      <Card className="divide-y divide-border py-1">
        <InfoRow label="رقم الواتساب" icon={<PhoneIcon />}>
          <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener" className="font-semibold text-primary" dir="ltr">
            {formatPhoneForDisplay(c.phone)}
          </a>
        </InfoRow>
        <InfoRow label="المرافق الافتراضي" icon={<UserIcon />}>
          {c.default_companion_name ? (
            <>
              {c.default_companion_name}
              {c.default_companion_phone && (
                <span className="ms-2 text-sm text-muted" dir="ltr">
                  {formatPhoneForDisplay(c.default_companion_phone)}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted">ما في</span>
          )}
        </InfoRow>
        <InfoRow label="سعر الجلسة الافتراضي" icon={<CoinsIcon />}>
          {c.default_price != null ? formatMoney(c.default_price) : <span className="text-muted">السعر العام</span>}
        </InfoRow>
        <InfoRow label="لسا ما اندفع">
          {outstanding > 0 ? (
            <span className="font-semibold text-coral-text">{formatMoney(outstanding)}</span>
          ) : (
            <span className="text-status-confirmed-fg">كل الجلسات مدفوعة</span>
          )}
        </InfoRow>
        {c.notes && (
          <InfoRow label="ملاحظات">
            <p className="whitespace-pre-wrap">{c.notes}</p>
          </InfoRow>
        )}
      </Card>

      <Button className="w-full" onClick={() => navigate(`/appointments/new?client=${c.id}`)}>
        <PlusIcon width="18" height="18" />
        موعد جديد لـ{c.full_name.split(' ')[0]}
      </Button>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">المواعيد القادمة</h2>
        {appointments.isPending ? (
          <Spinner />
        ) : upcoming.length === 0 ? (
          <EmptyState text="ما في مواعيد قادمة" />
        ) : (
          upcoming.map((a) => <AppointmentRow key={a.id} appointment={a} now={now} showDate={formatShortDayDate(a.starts_at)} />)
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">المواعيد السابقة</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted">ما في مواعيد سابقة</p>
        ) : (
          past.map((a) => <AppointmentRow key={a.id} appointment={a} now={now} showDate={formatShortDayDate(a.starts_at)} />)
        )}
      </section>

      <div className="pt-2">
        <Button
          variant="ghost"
          onClick={() =>
            update.mutate(
              { id: c.id, patch: { archived: !c.archived } },
              { onSuccess: () => toast({ message: c.archived ? 'رجّعنا الزبون للقائمة.' : 'أرشفنا الزبون. مواعيده بتضل محفوظة.' }) },
            )
          }
        >
          {c.archived ? 'إلغاء الأرشفة' : 'أرشفة الزبون'}
        </Button>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="تعديل الزبون">
        <ClientForm
          initial={c}
          busy={update.isPending}
          error={update.error ? toArabicError(update.error) : null}
          onCancel={() => setEditing(false)}
          onSubmit={(input) =>
            update.mutate(
              { id: c.id, patch: input },
              {
                onSuccess: () => {
                  setEditing(false)
                  toast({ message: 'انحفظ.', variant: 'success' })
                },
              },
            )
          }
        />
      </Sheet>
    </div>
  )
}
