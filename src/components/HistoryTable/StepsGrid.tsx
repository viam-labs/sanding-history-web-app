import { Pass, Step } from '../../lib/types'
import RenderIf from '../RenderIf'
import { StepImagesGrid } from './StepImagesGrid'
import StepVideosGrid from '../StepVideosGrid'
import { formatDurationToMinutesSeconds } from '../../lib/videoUtils'
import { getStepVideos } from '../../lib/passUtils'
import { StepsVizSnapshotCard } from './StepsVizSnapshotCard'
import { SNAPSHOT_FILE_NAME_PREFIX } from '../../lib/constants'
import { useFiles } from '../../lib/contexts/FilesContext'
import { useCamera } from '../../lib/contexts/CameraContext'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { useVideoStore } from '../../lib/contexts/VideoStoreContext'
import { useMemo } from 'react'

interface StepsGridProps {
  pass: Pass
}
export const StepsGrid = ({ pass }: StepsGridProps) => {
  const { videoFiles, fetchTimestamp, fetchFiles } = useFiles()
  const { selectedCamera } = useCamera()
  const { machineId, organizationId } = useViamClients()
  const { videoStoreClient } = useVideoStore()
  const { binaryDataManager } = useFiles()
  //TODO: context for this maybe?
  const passFiles = useMemo(() => {
    const passStart = new Date(pass.start)
    const passEnd = new Date(pass.end)

    return binaryDataManager.getPassFiles(pass.pass_id, passStart, passEnd)
  }, [pass, binaryDataManager])

  const snapshotFiles = useMemo(() => {
    return passFiles.filter((file) =>
      file.fileName.includes(SNAPSHOT_FILE_NAME_PREFIX)
    )
  }, [passFiles])

  return (
    <div className="steps-grid">
      {/* Camera Images */}
      <RenderIf condition={selectedCamera !== ''}>
        <StepImagesGrid pass={pass} />
      </RenderIf>

      {/* Regular step cards */}
      {pass.steps.map((step: Step) => {
        const stepVideos = getStepVideos(step, videoFiles)

        return (
          <div key={step.name} className="step-card">
            <div className="step-name">{step.name}</div>
            <div className="step-timeline">
              <div className="step-time">
                <span className="time-label">Start</span>
                <span className="time-value">
                  {step.start.toLocaleTimeString()}
                </span>
              </div>
              <div className="timeline-arrow">→</div>
              <div className="step-time">
                <span className="time-label">End</span>
                <span className="time-value">
                  {step.end.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="step-duration">
              {formatDurationToMinutesSeconds(step.start, step.end)}
            </div>

            <StepVideosGrid
              step={step}
              stepVideos={stepVideos}
              videoFiles={videoFiles}
              fetchTimestamp={fetchTimestamp}
              videoStoreClient={videoStoreClient}
              fetchVideos={fetchFiles}
              machineId={machineId}
              organizationId={organizationId}
            />
          </div>
        )
      })}

      {/* View snapshot card */}
      <RenderIf condition={snapshotFiles.length > 0}>
        <StepsVizSnapshotCard snapshotFiles={snapshotFiles} />
      </RenderIf>
    </div>
  )
}
