import React from 'react'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import { useVideoModal } from '../../lib/contexts/VideoModalContext'

interface VideoActionButtonsProps {
  video: BinaryDataFile
}

export const VideoActionButtons: React.FC<VideoActionButtonsProps> = ({
  video,
}) => {
  const { setSelectedVideo } = useVideoModal()

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => setSelectedVideo(video)}
        className="max-h-7 flex-1 px-2 py-0 bg-blue-500 hover:bg-blue-600 text-white rounded text-[11px] font-medium cursor-pointer transition-colors duration-200 border-none"
        title="Play video"
      >
        ▶
      </button>
      {video.uri && (
        <a
          href={video.uri}
          download={video.fileName?.split('/').pop() || 'video.mp4'}
          onClick={(e) => e.stopPropagation()}
          className="max-h-7 flex-1 flex items-center justify-center px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded no-underline text-[15px] font-medium cursor-pointer transition-colors duration-200 border-none"
          title="Download video"
        >
          ↓
        </a>
      )}
    </div>
  )
}
