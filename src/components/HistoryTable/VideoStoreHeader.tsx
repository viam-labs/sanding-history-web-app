import React from 'react'

interface VideoStoreHeaderProps {
  storeName: string
}

export const VideoStoreHeader: React.FC<VideoStoreHeaderProps> = ({
  storeName,
}) => {
  return (
    <>
      <div
        className="text-[8px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wide flex items-center mb-3 overflow-hidden text-ellipsis whitespace-nowrap"
        title={`Video from: ${storeName}`}
      >
        <span className="text-base shrink-0">🎬</span>
        <span className="ml-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          {storeName}
        </span>
      </div>
    </>
  )
}
