import { useFiles } from '../lib/contexts/FilesContext'

function formatSyncDelay(delayMs: number): string {
  const seconds = Math.floor(delayMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${seconds}s`
  }
}

export function SyncDelayIndicator() {
  const { mostRecentSyncDelayMs } = useFiles()

  if (mostRecentSyncDelayMs === undefined) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600">
      <span className="font-medium">Sync delay:</span>
      <span className="font-mono">{formatSyncDelay(mostRecentSyncDelayMs)}</span>
    </div>
  )
}
