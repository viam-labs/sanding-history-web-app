import { useFiles } from '../lib/contexts/FilesContext'
import { formatDurationMs } from '../lib/uiUtils'
import { usePass } from '../lib/contexts/PassContext'
import { useEffect, useMemo, useState } from 'react'
import { BinaryDataFile } from '../lib/BinaryDataFile'

const TEN_MINUTES_MS = 10 * 60 * 1000 // 600,000 ms
const THIRTY_MINUTES_MS = 30 * 60 * 1000 // 1,800,000 ms

export function SyncDelayIndicator() {
  const { fetchMostRecentFile } = useFiles()
  const { passSummaries } = usePass()
  const mostRecentPass = useMemo(() => passSummaries[0], [passSummaries])
  const [mostRecentFile, setMostRecentFile] = useState<BinaryDataFile | undefined>(undefined)
  const [lastFetchTime, setLastFetchTime] = useState<Date | undefined>(undefined)

  useEffect(() => {
    let timeoutId: number;

    const fetchAndSchedule = () => {
      fetchMostRecentFile(mostRecentPass, (files) => {
        setMostRecentFile(files[0]);
      });
      setLastFetchTime(new Date())
      timeoutId = setTimeout(fetchAndSchedule, 10000); // 10 seconds
    };

    fetchAndSchedule();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [mostRecentPass, fetchMostRecentFile]);

  
  if (mostRecentFile === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <span className="font-medium">Most recent sync delay:</span>
        <span className="font-mono">Loading...</span>
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

  const syncDelayMs = mostRecentFile.getSyncDelayMs() ?? 0
  const delayColor = getDelayColor(syncDelayMs)
  const timeRequested = mostRecentFile.timeRequested
  const timeReceived = mostRecentFile.timeReceived

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
      {lastFetchTime && (
        <div className="flex flex-col gap-0.5 text-xs text-zinc-500">
          <span className="font-mono">
            Last fetched: {lastFetchTime.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}
