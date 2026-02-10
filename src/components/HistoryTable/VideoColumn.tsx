import React from 'react'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import { VideoActionButtons } from './VideoActionButtons'
import { VideoGenerateButton } from './VideoGenerateButton'

interface VideoColumnProps {
  title: string
  videos: BinaryDataFile[]
  isPolling: boolean
  onGenerate: () => void
  onPlayVideo: (video: BinaryDataFile) => void
  canGenerate?: boolean
}

export const VideoColumn: React.FC<VideoColumnProps> = ({
  title,
  videos,
  isPolling,
  onGenerate,
  onPlayVideo,
  canGenerate = false,
}) => {
  const hasVideos = videos.length > 0

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] text-gray-500 font-medium">{title}</div>
      {hasVideos ? (
        videos.map((video) => (
          <VideoActionButtons
            key={video.fileName}
            video={video}
            onPlay={onPlayVideo}
          />
        ))
      ) : canGenerate ? (
        <VideoGenerateButton isPolling={isPolling} onGenerate={onGenerate} />
      ) : (
        <div className="text-[10px] text-gray-400 italic py-2">No {title.toLowerCase()}</div>
      )}
    </div>
  )
}
