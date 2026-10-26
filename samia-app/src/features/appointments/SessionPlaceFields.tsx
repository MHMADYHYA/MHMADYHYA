import { Segmented } from '../../components/Controls'
import { Field, Input } from '../../components/Input'
import type { SessionType } from '../../lib/database.types'
import { SESSION_TYPE_OPTIONS } from '../../lib/place'

interface Props {
  idPrefix: string
  sessionType: SessionType
  onSessionTypeChange: (value: SessionType) => void
  location: string
  onLocationChange: (value: string) => void
  /** عنوان العيادة من الإعدادات: بيتعبى لحاله لما تختاري وجاهي */
  clinicAddress: string | null
}

/** اختيار زوم أو وجاهي، وعنوان الجلسة الوجاهية */
export function SessionPlaceFields({ idPrefix, sessionType, onSessionTypeChange, location, onLocationChange, clinicAddress }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">نوع الجلسة</h2>
        <Segmented
          ariaLabel="نوع الجلسة"
          options={SESSION_TYPE_OPTIONS}
          value={sessionType}
          onChange={(value) => {
            onSessionTypeChange(value)
            if (value === 'in_person' && !location.trim() && clinicAddress?.trim()) onLocationChange(clinicAddress.trim())
          }}
        />
      </div>
      {sessionType === 'in_person' ? (
        <Field
          label="عنوان الجلسة"
          htmlFor={`${idPrefix}-location`}
          hint={clinicAddress?.trim() ? 'بيوصل للزبون بالرسالة بدل رابط الزوم.' : 'بيوصل للزبون بالرسالة. احفظي عنوان العيادة بالإعدادات عشان يتعبى لحاله.'}
        >
          <Input id={`${idPrefix}-location`} value={location} onChange={(e) => onLocationChange(e.target.value)} />
        </Field>
      ) : (
        <p className="text-sm text-muted">بينعمل رابط زوم لحاله وبيوصل للزبون بالرسالة.</p>
      )}
    </div>
  )
}
