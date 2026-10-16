import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { useToast } from '../../components/Feedback'
import { Select, Textarea } from '../../components/Input'
import { useUpdateSettings } from '../../hooks/queries'
import type { SettingsRow } from '../../lib/database.types'
import { toArabicError } from '../../lib/errors'
import { sampleTemplateVars } from '../../lib/messages'
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  TEMPLATE_VARIABLE_LABELS,
  TEMPLATE_VARIABLES,
  fillTemplate,
  resolveTemplates,
  type TemplateKey,
} from '../../lib/templates'

/** محرر القوالب مع أزرار للمتغيرات ومعاينة مباشرة */
export function TemplateEditor({ settings }: { settings: SettingsRow }) {
  const update = useUpdateSettings()
  const toast = useToast()
  const templates = useMemo(() => resolveTemplates(settings.templates), [settings.templates])
  const [key, setKey] = useState<TemplateKey>('invite_client')
  const [draft, setDraft] = useState(templates[key])
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(templates[key])
  }, [key, templates])

  const sample = useMemo(() => sampleTemplateVars(), [])
  const preview = fillTemplate(draft, sample)
  const dirty = draft !== templates[key]

  function insertVariable(name: string) {
    const el = ref.current
    const token = `{${name}}`
    if (!el) return setDraft(draft + token)
    const start = el.selectionStart ?? draft.length
    const end = el.selectionEnd ?? draft.length
    const next = draft.slice(0, start) + token + draft.slice(end)
    setDraft(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  function save(value: string) {
    const next = { ...templates, [key]: value }
    update.mutate(
      { templates: next },
      {
        onSuccess: () => toast({ message: 'انحفظ القالب.', variant: 'success' }),
        onError: (err) => toast({ message: toArabicError(err), variant: 'error' }),
      },
    )
  }

  return (
    <div className="space-y-3">
      <Select aria-label="القالب" value={key} onChange={(e) => setKey(e.target.value as TemplateKey)}>
        {TEMPLATE_KEYS.map((k) => (
          <option key={k} value={k}>
            {TEMPLATE_LABELS[k]}
          </option>
        ))}
      </Select>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insertVariable(v)}
            title={TEMPLATE_VARIABLE_LABELS[v]}
            className="min-h-9 rounded-full bg-primary-soft px-3 text-xs font-semibold text-primary hover:bg-[#D6E5EA]"
          >
            {`{${v}}`}
          </button>
        ))}
      </div>
      <Textarea ref={ref} rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="نص القالب" />
      <div>
        <p className="mb-1 text-sm font-semibold text-muted">معاينة (بقيم تجريبية)</p>
        <pre className="whitespace-pre-wrap rounded-card bg-page-tint p-3.5 font-sans text-sm leading-relaxed">{preview || '—'}</pre>
        <p className="mt-1 text-xs text-muted">سطر فيه متغير فاضي (مثل السبب) بينشال من الرسالة لحاله.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save(draft)} disabled={!dirty || update.isPending || draft.trim() === ''}>
          {update.isPending ? 'لحظة...' : 'احفظ القالب'}
        </Button>
        <Button variant="ghost" onClick={() => setDraft(templates[key])} disabled={!dirty}>
          تراجع
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDraft(DEFAULT_TEMPLATES[key])
            save(DEFAULT_TEMPLATES[key])
          }}
          disabled={templates[key] === DEFAULT_TEMPLATES[key] && !dirty}
        >
          رجّع الافتراضي
        </Button>
      </div>
    </div>
  )
}
