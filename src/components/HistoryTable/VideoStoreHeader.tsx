import React from 'react'

interface VideoStoreHeaderProps {
  storeName: string
  isSelected?: boolean
}

export const VideoStoreHeader: React.FC<VideoStoreHeaderProps> = ({
  storeName,
  isSelected = false,
}) => {
  return (
    <>
      {isSelected && (
        <div className="text-[9px] text-slate-500 font-semibold tracking-wide mb-1">
          Selected video store
        </div>
      )}
      <div
        className="text-[8px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wide flex items-center mb-3 overflow-hidden text-ellipsis whitespace-nowrap"
        title={`Video ${isSelected ? 'store' : 'from'}: ${storeName}${isSelected ? ' (Currently selected)' : ''}`}
      >
        <span className="text-base shrink-0">🎬</span>
        <span className="ml-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          {storeName}
        </span>
      </div>
    </>
  )
}
