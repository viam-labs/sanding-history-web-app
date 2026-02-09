import React, { useState, useEffect, useRef } from 'react'
import VideoModal from '../VideoModal'
import { Step } from '../../lib/types'
import { generateVideo, getVideoStoreName } from '../../lib/videoUtils'
import { VideoPollingManager } from '../../lib/videoPollingManager'
import { constructStepLogUrl } from '../../lib/uiUtils'
import { useToast } from '../../lib/contexts/ToastContext'
import { useMemo } from 'react'
import { useVideoStore } from '../../lib/contexts/VideoStoreContext'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { useSinglePass } from '../../lib/contexts/SinglePassContext'
import { getStepVideos } from '../../lib/passUtils'
import Spinner from '../Spinner'

interface StepVideosGridProps {
  step: Step
}

const StepVideosGrid: React.FC<StepVideosGridProps> = ({ step }) => {
  const { videos, areVideosLoaded, fetchVideos } = useSinglePass()
  const { machineId, organizationId } = useViamClients()
  const [selectedVideo, setSelectedVideo] = useState<BinaryDataFile | null>(
    null
  )
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null)
  const { addMessage } = useToast()
  const [isPollingFull, setIsPollingFull] = useState<boolean>(false)
  const [isPollingLast30s, setIsPollingLast30s] = useState<boolean>(false)
  const requestIdFullRef = useRef<string | null>(null)
  const requestIdLast30sRef = useRef<string | null>(null)
  const pollingManager = VideoPollingManager.getInstance()
  const { videoStoreClient } = useVideoStore()

  // Separate full and last30s videos
  const { fullVideos, last30sVideos } = useMemo(() => {
    return getStepVideos(step, videos)
  }, [step, videos])

  // Group videos by video store
  const videosByStore = useMemo(() => {
    const stores = new Map<string, { fullVideos: BinaryDataFile[]; last30sVideos: BinaryDataFile[] }>()
    
    fullVideos.forEach((video) => {
      const storeName = getVideoStoreName(video)
      if (!stores.has(storeName)) {
        stores.set(storeName, { fullVideos: [], last30sVideos: [] })
      }
      stores.get(storeName)!.fullVideos.push(video)
    })
    
    last30sVideos.forEach((video) => {
      const storeName = getVideoStoreName(video)
      if (!stores.has(storeName)) {
        stores.set(storeName, { fullVideos: [], last30sVideos: [] })
      }
      stores.get(storeName)!.last30sVideos.push(video)
    })
    
    return stores
  }, [fullVideos, last30sVideos])

  // Check if current video store has any videos
  const hasFullVideoForStore = useMemo(() => {
    return fullVideos.some(
      (video) => getVideoStoreName(video) === videoStoreClient?.name
    )
  }, [fullVideos, videoStoreClient])

  const hasLast30sVideoForStore = useMemo(() => {
    return last30sVideos.some(
      (video) => getVideoStoreName(video) === videoStoreClient?.name
    )
  }, [last30sVideos, videoStoreClient])

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
    pollingManager.setFetchData(() => fetchVideos(true))
  }

  // Update polling manager whenever videoFiles changes
  useEffect(() => {
    pollingManager.updateCurrentVideos(videos)
    pollingManager.forceVideoCheck()
  }, [videos])

  // Stop polling if videos are now available
  useEffect(() => {
    if (hasFullVideoForStore && isPollingFull) {
      setIsPollingFull(false)
      if (requestIdFullRef.current) {
        pollingManager.removeRequest(requestIdFullRef.current)
        requestIdFullRef.current = null
      }
    }
    if (hasLast30sVideoForStore && isPollingLast30s) {
      setIsPollingLast30s(false)
      if (requestIdLast30sRef.current) {
        pollingManager.removeRequest(requestIdLast30sRef.current)
        requestIdLast30sRef.current = null
      }
    }
  }, [hasFullVideoForStore, hasLast30sVideoForStore, isPollingFull, isPollingLast30s])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (requestIdFullRef.current) {
        pollingManager.removeRequest(requestIdFullRef.current)
      }
      if (requestIdLast30sRef.current) {
        pollingManager.removeRequest(requestIdLast30sRef.current)
      }
    }
  }, [])

  const handleVideoClick = (video: BinaryDataFile) => {
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

  const handleGenerateVideo = async (last30s: boolean = false) => {
    if (!videoStoreClient) {
      console.error('No video store client available')
      return
    }

    // Register fetch function for this step's time range
    registerFetchForPolling()
    
    if (last30s) {
      setIsPollingLast30s(true)
    } else {
      setIsPollingFull(true)
    }

    try {
      // Start video generation
      await generateVideo(videoStoreClient, step, last30s)

      if (!videoStoreClient.name) {
        const errorMessage = 'No video store name available'
        console.error(errorMessage)
        addMessage({ message: errorMessage, type: 'error' })
        throw new Error(errorMessage)
      }

      // Add to polling manager
      const requestId = pollingManager.addRequest(
        step,
        videoStoreClient.name,
        () => {
          if (last30s) {
            setIsPollingLast30s(false)
          } else {
            setIsPollingFull(false)
          }
        },
        () => {
          if (last30s) {
            setIsPollingLast30s(false)
          } else {
            setIsPollingFull(false)
          }
          addMessage({
            message:
              'Video generation timed out. The video may still be processing.',
            type: 'warning',
          })
        },
        last30s
      )
      
      if (last30s) {
        requestIdLast30sRef.current = requestId
      } else {
        requestIdFullRef.current = requestId
      }
    } catch (error) {
      console.error('Error generating video:', error)
      addMessage({ message: `Error generating video: ${error}`, type: 'error' })
      if (last30s) {
        setIsPollingLast30s(false)
      } else {
        setIsPollingFull(false)
      }
    }
  }

  const showLogsLink =
    machineId &&
    organizationId &&
    step.end.getTime() - step.start.getTime() >= 1000

  return (
    <>
      {/* Loading state */}
      {fullVideos.length === 0 && last30sVideos.length === 0 && !areVideosLoaded && (
        <div className="loading-state flex flex-col items-center justify-center p-5 text-gray-500">
          <Spinner size="24px" />
          <div className="text-sm">Loading videos...</div>
        </div>
      )}

      {/* Generate/Display section for current video store */}
      {areVideosLoaded && videoStoreClient && (!hasFullVideoForStore || !hasLast30sVideoForStore || videosByStore.has(videoStoreClient.name)) && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          {/* Video store label */}
          <div
            className="text-[8px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wide flex items-center mb-3 overflow-hidden text-ellipsis whitespace-nowrap"
            title={`Video store: ${videoStoreClient.name}`}
          >
            <span className="text-base shrink-0">🎬</span>
            <span className="ml-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
              {videoStoreClient.name}
            </span>
          </div>

          {/* Two-column layout for generate/display */}
          <div className="grid grid-cols-2 gap-3">
            {/* Full video column */}
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-gray-500 font-medium">
                {hasFullVideoForStore ? 'Full video' : 'Full'}
              </div>
              {hasFullVideoForStore ? (
                // Show existing full videos
                videosByStore.get(videoStoreClient.name)?.fullVideos.map((video) => (
                  <div key={video.fileName} className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleVideoClick(video)}
                      className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[11px] font-medium cursor-pointer transition-colors duration-200 border-none"
                      title="Play video"
                    >
                      🎬
                    </button>
                    {video.uri && (
                      <a
                        href={video.uri}
                        download={video.fileName?.split('/').pop() || 'video.mp4'}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded no-underline text-[11px] font-medium text-center cursor-pointer transition-colors duration-200 border-none"
                        title="Download video"
                      >
                        ⬇️
                      </a>
                    )}
                  </div>
                ))
              ) : (
                // Show generate button for full video
                <>
                  <button
                    type="button"
                    className={`px-2 py-1.5 text-xs text-white border-none rounded transition-colors duration-200 flex items-center justify-center gap-1.5 ${
                      isPollingFull
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                    }`}
                    onClick={() => handleGenerateVideo(false)}
                    disabled={isPollingFull}
                  >
                    {isPollingFull ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate'
                    )}
                  </button>
                  {isPollingFull && (
                    <div className="text-[9px] text-gray-500 text-center">
                      This can take a few minutes
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Last 30s column */}
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-gray-500 font-medium">
                {hasLast30sVideoForStore ? 'Last 30s' : 'Last 30s'}
              </div>
              {hasLast30sVideoForStore ? (
                // Show existing last30s videos
                videosByStore.get(videoStoreClient.name)?.last30sVideos.map((video) => (
                  <div key={video.fileName} className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleVideoClick(video)}
                      className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[11px] font-medium cursor-pointer transition-colors duration-200 border-none"
                      title="Play video"
                    >
                      🎬
                    </button>
                    {video.uri && (
                      <a
                        href={video.uri}
                        download={video.fileName?.split('/').pop() || 'video.mp4'}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded no-underline text-[11px] font-medium text-center cursor-pointer transition-colors duration-200 border-none"
                        title="Download video"
                      >
                        ⬇️
                      </a>
                    )}
                  </div>
                ))
              ) : (
                // Show generate button for last30s video
                <>
                  <button
                    type="button"
                    className={`px-2 py-1.5 text-xs text-white border-none rounded transition-colors duration-200 flex items-center justify-center gap-1.5 ${
                      isPollingLast30s
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                    }`}
                    onClick={() => handleGenerateVideo(true)}
                    disabled={isPollingLast30s}
                  >
                    {isPollingLast30s ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate'
                    )}
                  </button>
                  {isPollingLast30s && (
                    <div className="text-[9px] text-gray-500 text-center">
                      This can take a few minutes
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video display sections for OTHER video stores (not the current one) */}
      {videosByStore.size > 0 && (
        <div className="flex flex-col gap-3 py-2">
          {Array.from(videosByStore.entries())
            .filter(([storeName]) => storeName !== videoStoreClient?.name)
            .map(([storeName, storeVideos]) => (
            <div
              key={storeName}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              {/* Video store label */}
              <div
                className="text-[8px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wide flex items-center mb-3 overflow-hidden text-ellipsis whitespace-nowrap"
                title={`Video from: ${storeName}`}
              >
                <span className="text-base shrink-0">🎬</span>
                <span className="ml-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                  {storeName}
                </span>
              </div>

              {/* Two-column video display */}
              <div className="grid grid-cols-2 gap-3">
                {/* Full video column */}
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-gray-500 font-medium">Full video</div>
                  {storeVideos.fullVideos.length > 0 ? (
                    storeVideos.fullVideos.map((video) => (
                      <div key={video.fileName} className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleVideoClick(video)}
                          className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[11px] font-medium cursor-pointer transition-colors duration-200 border-none"
                          title="Play video"
                        >
                          🎬
                        </button>
                        {video.uri && (
                          <a
                            href={video.uri}
                            download={video.fileName?.split('/').pop() || 'video.mp4'}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded no-underline text-[11px] font-medium text-center cursor-pointer transition-colors duration-200 border-none"
                            title="Download video"
                          >
                            ⬇️
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-gray-400 italic py-2">No full video</div>
                  )}
                </div>

                {/* Last 30s column */}
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-gray-500 font-medium">Last 30s</div>
                  {storeVideos.last30sVideos.length > 0 ? (
                    storeVideos.last30sVideos.map((video) => (
                      <div key={video.fileName} className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleVideoClick(video)}
                          className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[11px] font-medium cursor-pointer transition-colors duration-200 border-none"
                          title="Play video"
                        >
                          🎬
                        </button>
                        {video.uri && (
                          <a
                            href={video.uri}
                            download={video.fileName?.split('/').pop() || 'video.mp4'}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded no-underline text-[11px] font-medium text-center cursor-pointer transition-colors duration-200 border-none"
                            title="Download video"
                          >
                            ⬇️
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-gray-400 italic py-2">No last 30s video</div>
                  )}
                </div>
              </div>
            </div>
          ))}
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
