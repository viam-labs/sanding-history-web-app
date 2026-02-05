import { useFiles } from '../lib/contexts/FilesContext'
import { formatDurationMs } from '../lib/uiUtils'

const TEN_MINUTES_MS = 10 * 60 * 1000 // 600,000 ms
const THIRTY_MINUTES_MS = 30 * 60 * 1000 // 1,800,000 ms

export function SyncDelayIndicator() {
  const { mostRecentReceivedFile: getMostRecentReceivedFile } = useFiles()

  if (getMostRecentReceivedFile() === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <span className="font-medium">Most recent sync delay:</span>
        <span className="font-mono">Expand a row to see the sync delay</span>
      </div>
    )
  }

  // Determine color based on sync delay thresholds
  const getDelayColor = (delayMs: number): string => {
    if (delayMs >= THIRTY_MINUTES_MS) {
      return 'text-red-600'
    } else if (delayMs >= TEN_MINUTES_MS) {
      return 'text-yellow-600'
    }
    return 'text-zinc-600'
  }

  const syncDelayMs = getMostRecentReceivedFile()?.getSyncDelayMs() ?? 0
  const delayColor = getDelayColor(syncDelayMs)
  const timeRequested = getMostRecentReceivedFile()?.timeRequested
  const timeReceived = getMostRecentReceivedFile()?.timeReceived

  return (
    <div className={`flex flex-col gap-1 text-sm ${delayColor}`}>
      <div className="flex items-center gap-2">
        <span className="font-medium">Most recent sync delay:</span>
        <span className="font-mono">{formatDurationMs(syncDelayMs)}</span>
      </div>
      {timeRequested && timeReceived && (
        <div className="flex flex-col gap-0.5 text-xs text-zinc-500">
          <span className="font-mono">
            Captured: {timeRequested.toLocaleString()}
          </span>
          <span className="font-mono">
            Received: {timeReceived.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}
