import { STATUS_LABELS, type AppointmentStatus } from '../lib/status'

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  pending: 'bg-status-pending text-status-pending-fg',
  confirmed: 'bg-status-confirmed text-status-confirmed-fg',
  declined: 'bg-status-declined text-status-declined-fg',
  change_requested: 'bg-status-change text-status-change-fg',
  cancelled: 'bg-status-cancelled text-status-cancelled-fg line-through',
  attended: 'bg-status-attended text-status-attended-fg',
  no_show: 'bg-status-no-show text-status-no-show-fg',
}

/** شارة ناعمة: خلفية فاتحة ونص غامق، ودايماً مع اسم الحالة (ما نعتمد على اللون لحاله) */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      data-status={status}
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
