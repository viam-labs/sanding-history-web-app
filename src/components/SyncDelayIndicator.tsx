import { useFiles } from '../lib/contexts/FilesContext'
import { formatDurationMs } from '../lib/uiUtils'
import { usePass } from '../lib/contexts/PassContext'
import { useEffect, useMemo, useState } from 'react'
import { BinaryDataFile } from '../lib/BinaryDataFile'

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

  return (
    <div className={`flex ${!mostRecentFile ? 'items-center gap-2 text-zinc-600' : 'flex-col gap-1'} text-sm`}>
      <div className="flex items-center gap-2">
        <span className="font-medium">Most recent sync delay:</span>
        <span className="font-mono">
          {!mostRecentFile ? 'Loading...' : formatDurationMs(mostRecentFile.getSyncDelayMs() ?? 0)}
        </span>
      </div>
      {mostRecentFile && (
        <>
          <div className="flex flex-col gap-0.5 text-xs text-zinc-500">
            <span className="font-mono">Captured: {mostRecentFile.timeRequested?.toLocaleString()}</span>
            <span className="font-mono">Received: {mostRecentFile.timeReceived?.toLocaleString()}</span>
          </div>
          {lastFetchTime && (
            <div className="flex flex-col gap-0.5 text-xs text-zinc-500">
              <span className="font-mono">Last fetched: {lastFetchTime.toLocaleString()}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
