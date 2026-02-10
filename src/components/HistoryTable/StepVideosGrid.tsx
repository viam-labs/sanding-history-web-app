import React, { useState, useEffect, useRef, useMemo } from 'react'
import VideoModal from '../VideoModal'
import { Step } from '../../lib/types'
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
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null)
  const { addMessage } = useToast()
  const [isPollingFull, setIsPollingFull] = useState<boolean>(false)
  const [isPollingLast30s, setIsPollingLast30s] = useState<boolean>(false)
  const requestIdFullRef = useRef<string | null>(null)
  const requestIdLast30sRef = useRef<string | null>(null)
  const pollingManager = VideoPollingManager.getInstance()
  const { videoStoreClient } = useVideoStore()

  const { fullVideos, last30sVideos } = useMemo(() => {
    return getStepVideos(step, videos)
  }, [step, videos])

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

  const hasVideosFromOtherStores = useMemo(() => {
    return Array.from(videosByStore.keys()).some(
      (storeName) => storeName !== videoStoreClient?.name
    )
  }, [videosByStore, videoStoreClient])

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

  const registerFetchForPolling = () => {
    pollingManager.setFetchData(() => fetchVideos(true))
  }

  useEffect(() => {
    pollingManager.updateCurrentVideos(videos)
    pollingManager.forceVideoCheck()
  }, [videos])

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
      {fullVideos.length === 0 && last30sVideos.length === 0 && !areVideosLoaded && (
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
          <VideoStoreHeader 
            storeName={videoStoreClient.name} 
            isSelected={hasVideosFromOtherStores} 
          />

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
