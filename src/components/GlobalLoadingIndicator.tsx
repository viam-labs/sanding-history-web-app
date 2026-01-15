import React from 'react'
import Spinner from './Spinner'
import { useFiles } from '../lib/contexts/FilesContext'

const GlobalLoadingIndicator: React.FC = () => {
  const { fetchTimestamp, files, videoFiles, imageFiles } = useFiles()
  if (!fetchTimestamp) return null

  const fileCount = files.size + videoFiles.size + imageFiles.size

  return (
    <div className="fixed bottom-6 right-6 bg-black/90 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[9999] animate-slide-in-up min-w-[280px]">
      <div className="shrink-0">
        <Spinner size="16px" borderWidth="2px" color="#46beffff" />
      </div>

      <div className="flex flex-col gap-0.5 flex-1">
        <span className="text-sm text-zinc-50 font-medium">
          Fetching binary data...
        </span>

        <span className="text-xs text-zinc-400">
          {fetchTimestamp && (
            <>
              {fetchTimestamp.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              {fetchTimestamp.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </>
          )}
          {fetchTimestamp && fileCount !== undefined && fileCount > 0 && ' · '}
          {fileCount !== undefined && fileCount > 0 && (
            <>{fileCount.toLocaleString()} files</>
          )}
        </span>
      </div>

      <style>{`
        @keyframes slide-in-up {
          from { 
            transform: translateY(100%);
            opacity: 0;
          }
          to { 
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
        }
      `}</style>
    </div>
  )
}

export default GlobalLoadingIndicator
