import React from 'react'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import { VideoType } from '../../lib/types'
import { useStepVideos } from '../../lib/contexts/StepVideosContext'
import { VideoActionButtons } from './VideoActionButtons'
import { VideoGenerateButton } from './VideoGenerateButton'

interface VideoColumnProps {
  videoType: VideoType
  videos: BinaryDataFile[]
  /** Whether this column is for the active video store (enables generate) */
  isActiveStore?: boolean
}

const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  FULL: 'Full video',
  LAST_30_S: 'Last 30s',
}

export const VideoColumn: React.FC<VideoColumnProps> = ({
  videoType,
  videos,
  isActiveStore = false,
}) => {
  const { isPolling, hasVideoForStore, handleGenerateVideo } = useStepVideos()
  const label = VIDEO_TYPE_LABELS[videoType]
  const hasVideos = videos.length > 0
  const canGenerate = isActiveStore && !hasVideoForStore(videoType)
  const polling = isActiveStore && isPolling(videoType)

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] text-gray-500 font-medium">{label}</div>
      {hasVideos ? (
        videos.map((video) => (
          <VideoActionButtons
            key={video.fileName}
            video={video}
          />
        ))
      ) : canGenerate ? (
        <VideoGenerateButton isPolling={polling} onGenerate={() => handleGenerateVideo(videoType)} />
      ) : (
        <div className="text-[10px] text-gray-400 italic py-2">No {label.toLowerCase()}</div>
      )}
    </div>
  )
}
