import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from 'react'
import { Step, VideoType } from '../types'
import { generateVideo, getVideoStoreName } from '../videoUtils'
import { VideoPollingManager } from '../videoPollingManager'
import { useToast } from './ToastContext'
import { useVideoStore } from './VideoStoreContext'
import { BinaryDataFile } from '../BinaryDataFile'
import { useSinglePass } from './SinglePassContext'
import { getStepVideos } from '../passUtils'

interface StepVideosContextType {
  step: Step
  videosByStore: Map<
    string,
    { fullVideos: BinaryDataFile[]; last30sVideos: BinaryDataFile[] }
  >
  areVideosLoaded: boolean
  hasVideos: boolean
  isPolling: (videoType: VideoType) => boolean
  hasVideoForStore: (videoType: VideoType) => boolean
  handleGenerateVideo: (videoType: VideoType) => Promise<void>
}

const StepVideosContext = createContext<StepVideosContextType | undefined>(
  undefined
)

interface StepVideosProviderProps {
  step: Step
  children: ReactNode
}

export const StepVideosProvider: React.FC<StepVideosProviderProps> = ({
  step,
  children,
}) => {
  const { videos, areVideosLoaded, fetchVideos } = useSinglePass()
  const { addMessage } = useToast()
  const { videoStoreClient } = useVideoStore()
  const [isPollingFull, setIsPollingFull] = useState(false)
  const [isPollingLast30s, setIsPollingLast30s] = useState(false)
  const requestIdFullRef = useRef<string | null>(null)
  const requestIdLast30sRef = useRef<string | null>(null)
  const pollingManager = VideoPollingManager.getInstance()

  const { fullVideos, last30sVideos } = useMemo(() => {
    return getStepVideos(step, videos)
  }, [step, videos])

  const videosByStore = useMemo(() => {
    const stores = new Map<
      string,
      { fullVideos: BinaryDataFile[]; last30sVideos: BinaryDataFile[] }
    >()

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

  const hasVideos = fullVideos.length > 0 || last30sVideos.length > 0

  // Polling manager registration
  const registerFetchForPolling = useCallback(() => {
    pollingManager.registerPassFetcher(step.pass_id, () => fetchVideos(true))
  }, [step.pass_id, fetchVideos, pollingManager])

  useEffect(() => {
    pollingManager.updatePassVideos(step.pass_id, videos)
    pollingManager.forceVideoCheck()
  }, [videos, step.pass_id, pollingManager])

  // Stop polling if full video is now available
  useEffect(() => {
    if (hasFullVideoForStore && isPollingFull) {
      setIsPollingFull(false)
      if (requestIdFullRef.current) {
        pollingManager.removeRequest(requestIdFullRef.current)
        requestIdFullRef.current = null
      }
    }
  }, [hasFullVideoForStore, isPollingFull, pollingManager])

  // Stop polling if last30s video is now available
  useEffect(() => {
    if (hasLast30sVideoForStore && isPollingLast30s) {
      setIsPollingLast30s(false)
      if (requestIdLast30sRef.current) {
        pollingManager.removeRequest(requestIdLast30sRef.current)
        requestIdLast30sRef.current = null
      }
    }
  }, [hasLast30sVideoForStore, isPollingLast30s, pollingManager])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (requestIdFullRef.current) {
        pollingManager.removeRequest(requestIdFullRef.current)
      }
      if (requestIdLast30sRef.current) {
        pollingManager.removeRequest(requestIdLast30sRef.current)
      }
    }
  }, [pollingManager])

  const isPolling = useCallback(
    (videoType: VideoType) =>
      videoType === 'FULL' ? isPollingFull : isPollingLast30s,
    [isPollingFull, isPollingLast30s]
  )

  const hasVideoForStore = useCallback(
    (videoType: VideoType) =>
      videoType === 'FULL' ? hasFullVideoForStore : hasLast30sVideoForStore,
    [hasFullVideoForStore, hasLast30sVideoForStore]
  )

  const handleGenerateVideo = useCallback(
    async (videoType: VideoType) => {
      if (!videoStoreClient) {
        console.error('No video store client available')
        return
      }

      const last30s = videoType === 'LAST_30_S'
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
        addMessage({
          message: `Error generating video: ${error}`,
          type: 'error',
        })
        if (last30s) {
          setIsPollingLast30s(false)
        } else {
          setIsPollingFull(false)
        }
      }
    },
    [videoStoreClient, step, registerFetchForPolling, addMessage, pollingManager]
  )

  const value = useMemo(
    () => ({
      step,
      videosByStore,
      areVideosLoaded,
      hasVideos,
      isPolling,
      hasVideoForStore,
      handleGenerateVideo,
    }),
    [
      step,
      videosByStore,
      areVideosLoaded,
      hasVideos,
      isPolling,
      hasVideoForStore,
      handleGenerateVideo,
    ]
  )

  return (
    <StepVideosContext.Provider value={value}>
      {children}
    </StepVideosContext.Provider>
  )
}

export function useStepVideos() {
  const context = useContext(StepVideosContext)
  if (context === undefined) {
    throw new Error('useStepVideos must be used within a StepVideosProvider')
  }
  return context
}
