import { Pass } from '../lib/types'
import { getPassStatusLabel } from '../lib/passUtils'

const STATUS_CLASSNAMES: Record<string, string> = {
  Success: 'bg-green-100 text-green-800',
  Failed: 'bg-red-100 text-red-800',
  Cancelled: 'bg-orange-100 text-orange-800',
  Incomplete: 'bg-amber-100 text-amber-800',
  'In Progress': 'bg-blue-100 text-blue-800',
}

export const StatusBadge = (props: { pass: Pass; isIncomplete: boolean }) => {
  const label = getPassStatusLabel(props.pass, props.isIncomplete)
  const className = STATUS_CLASSNAMES[label] ?? STATUS_CLASSNAMES.Success
  return (
    <span
      className={`moveleft inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium status-badge-width ${className}`}
    >
      {label}
    </span>
  )
}
