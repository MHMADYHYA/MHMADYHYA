import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { PageTitle } from '../../components/Controls'
import { EmptyState, ErrorNotice, Spinner, useToast } from '../../components/Feedback'
import { ChevronLeftIcon, PlusIcon, SearchIcon } from '../../components/Icons'
import { Input, Toggle } from '../../components/Input'
import { Sheet } from '../../components/Sheet'
import { useClients, useCreateClient } from '../../hooks/queries'
import { toArabicError } from '../../lib/errors'
import { formatPhoneForDisplay } from '../../lib/phone'
import { ClientForm } from './ClientForm'

export function ClientsPage() {
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [adding, setAdding] = useState(false)
  const clients = useClients(showArchived)
  const create = useCreateClient()
  const toast = useToast()
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = clients.data ?? []
    if (!q) return list
    const digits = q.replace(/\D/g, '')
    return list.filter((c) => c.full_name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits)))
  }, [clients.data, search])

  return (
    <div className="space-y-4">
      <PageTitle
        title="الزبائن"
        subtitle={clients.data ? `${clients.data.length} زبون` : undefined}
        action={
          <Button onClick={() => setAdding(true)}>
            <PlusIcon width="18" height="18" />
            زبون جديد
          </Button>
        }
      />
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          aria-label="بحث"
          placeholder="بحث بالاسم أو الرقم"
          className="ps-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Toggle checked={showArchived} onChange={setShowArchived} label="إظهار المؤرشفين" />

      {clients.isPending ? (
        <Spinner />
      ) : clients.isError ? (
        <ErrorNotice message={(clients.error as Error).message} onRetry={() => void clients.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState text={search ? 'ما لقينا زبون بهاد الاسم' : 'لسا ما في زبائن'} hint={search ? undefined : 'اكبس "زبون جديد" لإضافة أول زبون'} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to={`/clients/${c.id}`}
                className="flex items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3 hover:bg-page-tint/60"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary">
                  {c.full_name.trim().charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {c.full_name}
                    {c.archived && <span className="ms-2 rounded-full bg-page-tint px-2 py-0.5 text-xs text-muted">مؤرشف</span>}
                  </p>
                  <p className="text-sm text-muted" dir="ltr">
                    {formatPhoneForDisplay(c.phone)}
                  </p>
                </div>
                <ChevronLeftIcon className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="زبون جديد">
        <ClientForm
          busy={create.isPending}
          error={create.error ? toArabicError(create.error) : null}
          submitLabel="أضف الزبون"
          onCancel={() => setAdding(false)}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (client) => {
                setAdding(false)
                toast({ message: 'انضاف الزبون.', variant: 'success' })
                navigate(`/clients/${client.id}`)
              },
            })
          }
        />
      </Sheet>
    </div>
  )
}
