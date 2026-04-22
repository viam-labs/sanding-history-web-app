import { Pass } from '../lib/types'

const getStatus = (pass: Pass): { label: string; className: string } => {
  // Use current_state as the primary signal (set by backend on all new records)
  if (pass.current_state) {
    if (pass.current_state === 'Succeeded') {
      return { label: 'Success', className: 'bg-green-100 text-green-800' }
    }
    if (pass.current_state === 'Failed') {
      return { label: 'Failed', className: 'bg-red-100 text-red-800' }
    }
    if (pass.current_state === 'Cancelled') {
      return { label: 'Cancelled', className: 'bg-orange-100 text-orange-800' }
    }
    // Any other state (e.g. Executing, GeneratingMesh) is in progress
    return { label: pass.current_state, className: 'bg-blue-100 text-blue-800' }
  }

  // Legacy fallback for records without current_state
  if (pass.success) {
    return { label: 'Success', className: 'bg-green-100 text-green-800' }
  }
  return { label: 'Failed', className: 'bg-red-100 text-red-800' }
}

export const StatusBadge = (props: { pass: Pass }) => {
  const { label, className } = getStatus(props.pass)
  return (
    <span
      className={`moveleft inline-flex items-center justify-center py-1 rounded-full text-xs font-medium status-badge-width ${className}`}
    >
      {label}
    </span>
  )
}
