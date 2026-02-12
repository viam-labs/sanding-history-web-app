import React from 'react'
import VideoModal from '../VideoModal'
import { Step } from '../../lib/types'
import { constructStepLogUrl } from '../../lib/uiUtils'
import { useVideoStore } from '../../lib/contexts/VideoStoreContext'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import Spinner from '../Spinner'
import { VideoStoreHeader } from './VideoStoreHeader'
import { VideoColumn } from './VideoColumn'
import { VideoModalProvider, useVideoModal } from '../../lib/contexts/VideoModalContext'
import { StepVideosProvider, useStepVideos } from '../../lib/contexts/StepVideosContext'

interface StepVideosGridProps {
  step: Step
}

const StepVideosGridContent: React.FC = () => {
  const { step, videosByStore, areVideosLoaded, hasVideos, hasVideoForStore } = useStepVideos()
  const { machineId, organizationId } = useViamClients()
  const { selectedVideo, setSelectedVideo } = useVideoModal()
  const { videoStoreClient } = useVideoStore()

  const hasFullVideoForStore = hasVideoForStore('FULL')
  const hasLast30sVideoForStore = hasVideoForStore('LAST_30_S')

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
              videoType="FULL"
              videos={videosByStore.get(videoStoreClient.name)?.fullVideos || []}
              isActiveStore
            />

            <VideoColumn
              videoType="LAST_30_S"
              videos={videosByStore.get(videoStoreClient.name)?.last30sVideos || []}
              isActiveStore
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
                  videoType="FULL"
                  videos={storeVideos.fullVideos}
                />

                <VideoColumn
                  videoType="LAST_30_S"
                  videos={storeVideos.last30sVideos}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <VideoModal selectedVideo={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </>
  )
}

const StepVideosGrid: React.FC<StepVideosGridProps> = ({ step }) => {
  return (
    <VideoModalProvider>
      <StepVideosProvider step={step}>
        <StepVideosGridContent />
      </StepVideosProvider>
    </VideoModalProvider>
  )
}

export default StepVideosGrid
