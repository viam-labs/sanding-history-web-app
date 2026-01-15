import React, { useState, useEffect, useRef } from 'react'
import * as VIAM from '@viamrobotics/sdk'
import VideoModal from './VideoModal'
import { Step } from '../lib/types'
import { generateVideo, getVideoStoreName } from '../lib/videoUtils'
import { VideoPollingManager } from '../lib/videoPollingManager'
import { constructStepLogUrl } from '../lib/uiUtils'
import { useToast } from '../lib/contexts/ToastContext'
import { useMemo } from 'react'
import { useVideoStore } from '../lib/contexts/VideoStoreContext'

interface StepVideosGridProps {
  stepVideos: VIAM.dataApi.BinaryData[]
  videoFiles: Map<string, VIAM.dataApi.BinaryData>
  step: Step
  fetchVideos: (start: Date, shouldSetLoadingState: boolean) => Promise<void>
  fetchTimestamp: Date | null
  machineId: string
  organizationId: string
}

const StepVideosGrid: React.FC<StepVideosGridProps> = ({
  stepVideos,
  videoFiles,
  step,
  fetchVideos,
  fetchTimestamp,
  machineId,
  organizationId,
}) => {
  const [selectedVideo, setSelectedVideo] =
    useState<VIAM.dataApi.BinaryData | null>(null)
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null)
  const { addMessage } = useToast()
  const [isPolling, setIsPolling] = useState<boolean>(false)
  const requestIdRef = useRef<string | null>(null)
  const pollingManager = VideoPollingManager.getInstance()
  const { videoStoreClient } = useVideoStore()

  // Add CSS keyframes for spinner animation
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Register this step's fetch function with the polling manager when generating
  // The polling manager will use the most recent fetchVideos function set
  const registerFetchForPolling = () => {
    pollingManager.setFetchData(() => fetchVideos(step.start, false))
  }

  // Update polling manager whenever videoFiles changes
  useEffect(() => {
    pollingManager.updateCurrentVideos(videoFiles)
    pollingManager.forceVideoCheck()
  }, [videoFiles])

  const hasVideosForVideoStore = useMemo(() => {
    return stepVideos.some(
      (video) => getVideoStoreName(video) === videoStoreClient?.name
    )
  }, [stepVideos, videoStoreClient])

  // Stop polling if videos are now available (handles the case where video appears)
  useEffect(() => {
    if (hasVideosForVideoStore && isPolling) {
      setIsPolling(false)
      if (requestIdRef.current) {
        pollingManager.removeRequest(requestIdRef.current)
        requestIdRef.current = null
      }
    }
  }, [hasVideosForVideoStore, isPolling])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (requestIdRef.current) {
        pollingManager.removeRequest(requestIdRef.current)
      }
    }
  }, [])

  const handleVideoClick = (video: VIAM.dataApi.BinaryData) => {
    setSelectedVideo(video)
  }

  const closeVideoModal = () => {
    // Clean up video URL if it exists
    if (modalVideoUrl && modalVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(modalVideoUrl)
    }
    setSelectedVideo(null)
    setModalVideoUrl(null)
  }

  const handleGenerateVideo = async () => {
    if (!videoStoreClient) {
      console.error('No video store client available')
      return
    }

    // Register fetch function for this step's time range
    registerFetchForPolling()

    setIsPolling(true)

    try {
      // Start video generation
      await generateVideo(videoStoreClient, step)

      if (!videoStoreClient.name) {
        const errorMessage = 'No video store name available'
        console.error(errorMessage)
        addMessage({ message: errorMessage, type: 'error' })
        throw new Error(errorMessage)
      }

      // Add to polling manager
      requestIdRef.current = pollingManager.addRequest(
        step,
        videoStoreClient.name,
        () => {
          setIsPolling(false)
        }
      )
    } catch (error) {
      console.error('Error generating video:', error)
      addMessage({ message: `Error generating video: ${error}`, type: 'error' })
      setIsPolling(false)
    }
  }

  const isLoading =
    stepVideos.length === 0 && fetchTimestamp && fetchTimestamp > step.start
  const showLogsLink =
    machineId &&
    organizationId &&
    step.end.getTime() - step.start.getTime() >= 1000

  return (
    <>
      {/* Loading state */}
      {isLoading && (
        <div className="loading-state flex flex-col items-center justify-center p-5 text-gray-500">
          <div className="w-6 h-6 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-2" />
          <div className="text-sm">Loading videos...</div>
        </div>
      )}

      {/* Generate video button */}
      {!hasVideosForVideoStore && !isLoading && (
        <div className="generate-video flex flex-col items-center justify-center mt-4">
          <button
            type="button"
            className={`generate-video-button px-2 py-1.5 text-xs text-white border-none rounded transition-colors duration-200 flex items-center gap-1.5 ${
              videoStoreClient == null || isPolling
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
            }`}
            onClick={() => handleGenerateVideo()}
            disabled={videoStoreClient == null || isPolling}
          >
            {isPolling ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Video'
            )}
          </button>
          {isPolling && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              This can take up to a minute.
            </div>
          )}
        </div>
      )}

      {/* Videos grid */}
      {stepVideos.length > 0 && (
        <div className="flex flex-wrap gap-3 py-2">
          {stepVideos.map((video) => {
            const videoStoreName = getVideoStoreName(video)
            return (
              <div
                key={video.metadata?.fileName}
                className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 w-full"
              >
                {/* Video store badge */}
                <div
                  className="text-[8px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wide flex items-center w-full box-border"
                  title={`Video from: ${videoStoreName}`}
                >
                  <span className="text-base shrink-0">🎬</span>
                  <span className="ml-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                    {videoStoreName}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleVideoClick(video)}
                    className="flex-1 px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-[11px] font-medium cursor-pointer transition-colors duration-200 border-none"
                  >
                    Play
                  </button>
                  {video.metadata?.uri && (
                    <a
                      href={video.metadata.uri}
                      download={
                        video.metadata?.fileName?.split('/').pop() ||
                        'video.mp4'
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded no-underline text-[11px] font-medium text-center cursor-pointer transition-colors duration-200 border-none"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Logs link - shared across all states */}
      {showLogsLink && (
        <a
          href={constructStepLogUrl(
            step.start,
            step.end,
            machineId,
            organizationId
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-blue-500 text-xs underline text-center"
        >
          View logs for this step
        </a>
      )}

      <VideoModal selectedVideo={selectedVideo} onClose={closeVideoModal} />
    </>
  )
}

export default StepVideosGrid
