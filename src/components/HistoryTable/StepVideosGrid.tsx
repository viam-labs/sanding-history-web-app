import React, { useState, useEffect, useRef, useMemo } from 'react'
import VideoModal from '../VideoModal'
import { Step, VideoBinaryDataFile } from '../../lib/types'
import { generateVideo, getVideoStoreName } from '../../lib/videoUtils'
import { VideoPollingManager } from '../../lib/videoPollingManager'
import { constructStepLogUrl } from '../../lib/uiUtils'
import { useToast } from '../../lib/contexts/ToastContext'
import { useVideoStore } from '../../lib/contexts/VideoStoreContext'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { useSinglePass } from '../../lib/contexts/SinglePassContext'
import { getStepVideos } from '../../lib/passUtils'
import Spinner from '../Spinner'
import { VideoStoreHeader } from './VideoStoreHeader'
import { VideoColumn } from './VideoColumn'
import { VideoModalProvider, useVideoModal } from '../../lib/contexts/VideoModalContext'

interface StepVideosGridProps {
  step: Step
}

const StepVideosGridContent: React.FC<StepVideosGridProps> = ({ step }) => {
  const { videos, areVideosLoaded, fetchVideos } = useSinglePass()
  const { machineId, organizationId } = useViamClients()
  const { selectedVideo, setSelectedVideo } = useVideoModal()
  const { addMessage } = useToast()
  const [isPollingFull, setIsPollingFull] = useState<boolean>(false)
  const [isPollingLast30s, setIsPollingLast30s] = useState<boolean>(false)
  const requestIdFullRef = useRef<string | null>(null)
  const requestIdLast30sRef = useRef<string | null>(null)
  const pollingManager = VideoPollingManager.getInstance()
  const { videoStoreClient } = useVideoStore()

  const {
    videosByStore,
    hasFullVideoForStore,
    hasLast30sVideoForStore,
    hasVideos,
  } = useMemo(() => {
    const { fullVideos: rawFull, last30sVideos: rawLast30s } = getStepVideos(
      step,
      videos
    )

    const allVideos: VideoBinaryDataFile[] = [
      ...rawFull.map((file) => ({ file, type: 'FULL' as const })),
      ...rawLast30s.map((file) => ({ file, type: 'LAST_30_S' as const })),
    ]

    const stores = new Map<
      string,
      { fullVideos: BinaryDataFile[]; last30sVideos: BinaryDataFile[] }
    >()
    let hasFull = false
    let hasLast30 = false

    allVideos.forEach(({ file, type }) => {
      const storeName = getVideoStoreName(file)
      if (!stores.has(storeName)) {
        stores.set(storeName, { fullVideos: [], last30sVideos: [] })
      }
      const store = stores.get(storeName)!

      if (type === 'FULL') {
        store.fullVideos.push(file)
        if (storeName === videoStoreClient?.name) {
          hasFull = true
        }
      } else {
        store.last30sVideos.push(file)
        if (storeName === videoStoreClient?.name) {
          hasLast30 = true
        }
      }
    })

    return {
      videosByStore: stores,
      hasFullVideoForStore: hasFull,
      hasLast30sVideoForStore: hasLast30,
      hasVideos: allVideos.length > 0,
    }
  }, [step, videos, videoStoreClient])

  const registerFetchForPolling = () => {
    pollingManager.registerPassFetcher(step.pass_id, () => fetchVideos(true))
  }

  useEffect(() => {
    pollingManager.updatePassVideos(step.pass_id, videos)
    pollingManager.forceVideoCheck()
  }, [videos, step.pass_id])

  // Stop polling if full video is now available
  useEffect(() => {
    if (hasFullVideoForStore && isPollingFull) {
      setIsPollingFull(false)
      if (requestIdFullRef.current) {
        pollingManager.removeRequest(requestIdFullRef.current)
        requestIdFullRef.current = null
      }
    }
  }, [hasFullVideoForStore, isPollingFull])

  // Stop polling if last30s video is now available
  useEffect(() => {
    if (hasLast30sVideoForStore && isPollingLast30s) {
      setIsPollingLast30s(false)
      if (requestIdLast30sRef.current) {
        pollingManager.removeRequest(requestIdLast30sRef.current)
        requestIdLast30sRef.current = null
      }
    }
  }, [hasLast30sVideoForStore, isPollingLast30s])

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

  const closeVideoModal = () => {
    setSelectedVideo(null)
  }

  const handleGenerateVideo = async (last30s: boolean = false) => {
    if (!videoStoreClient) {
      console.error('No video store client available')
      return
    }

    registerFetchForPolling()
    
    if (last30s) {
      setIsPollingLast30s(true)
    } else {
      setIsPollingFull(true)
    }

    try {
      await generateVideo(videoStoreClient, step, last30s)

      if (!videoStoreClient.name) {
        const errorMessage = 'No video store name available'
        console.error(errorMessage)
        addMessage({ message: errorMessage, type: 'error' })
        throw new Error(errorMessage)
      }

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
      {!hasVideos && !areVideosLoaded && (
        <div className="loading-state flex flex-col items-center justify-center p-5 text-gray-500">
          <Spinner size="24px" />
          <div className="text-sm">Loading videos...</div>
        </div>
      )}
      
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

      {areVideosLoaded && videoStoreClient && (!hasFullVideoForStore || !hasLast30sVideoForStore || videosByStore.has(videoStoreClient.name)) && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <VideoStoreHeader storeName={videoStoreClient.name} />

          <div className="grid grid-cols-2 gap-4">
            <VideoColumn
              title="Full video"
              videos={videosByStore.get(videoStoreClient.name)?.fullVideos || []}
              isPolling={isPollingFull}
              onGenerate={() => handleGenerateVideo(false)}
              canGenerate={!hasFullVideoForStore}
            />

            <VideoColumn
              title="Last 30s"
              videos={videosByStore.get(videoStoreClient.name)?.last30sVideos || []}
              isPolling={isPollingLast30s}
              onGenerate={() => handleGenerateVideo(true)}
              canGenerate={!hasLast30sVideoForStore}
            />
          </div>
        </div>
      )}

      {videosByStore.size > 0 && (
        <div className="flex flex-col gap-3 py-2">
          {Array.from(videosByStore.entries())
            .filter(([storeName]) => storeName !== videoStoreClient?.name)
            .map(([storeName, storeVideos]) => (
            <div
              key={storeName}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <VideoStoreHeader storeName={storeName} />

              <div className="grid grid-cols-2 gap-4">
                <VideoColumn
                  title="Full video"
                  videos={storeVideos.fullVideos}
                  isPolling={false}
                  onGenerate={() => {}}
                  canGenerate={false}
                />

                <VideoColumn
                  title="Last 30s"
                  videos={storeVideos.last30sVideos}
                  isPolling={false}
                  onGenerate={() => {}}
                  canGenerate={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <VideoModal selectedVideo={selectedVideo} onClose={closeVideoModal} />
    </>
  )
}

const StepVideosGrid: React.FC<StepVideosGridProps> = ({ step }) => {
  return (
    <VideoModalProvider>
      <StepVideosGridContent step={step} />
    </VideoModalProvider>
  )
}

export default StepVideosGrid
