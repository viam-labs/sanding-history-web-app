import { Step } from '../../lib/types'
import RenderIf from '../RenderIf'
import { StepImagesGrid } from './StepImagesGrid'
import StepVideosGrid from './StepVideosGrid.tsx'
import { formatDurationToMinutesSeconds } from '../../lib/videoUtils'
import { StepsVizSnapshotCard } from './StepsVizSnapshotCard'
import { SNAPSHOT_FILE_NAME_PREFIX } from '../../lib/constants'
import { useCamera } from '../../lib/contexts/CameraContext'
import { useMemo } from 'react'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'

export const StepsGrid = () => {
  const { pass, isFetching, fileCount, data } = useSinglePass()

  const { selectedCamera } = useCamera()

  const snapshotFiles = useMemo(() => {
    return data.filter((file) =>
      file.fileName.includes(SNAPSHOT_FILE_NAME_PREFIX)
    )
  }, [data])

  return (
    <div className="steps-grid">
      {/* Camera Images */}
      <RenderIf condition={selectedCamera !== ''}>
        <StepImagesGrid pass={pass} />
      </RenderIf>

      {/* Regular step cards */}
      {pass.steps.map((step: Step) => {
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

            <StepVideosGrid step={step} />
          </div>
        )
      })}

      {/* View snapshot card */}
      <RenderIf condition={snapshotFiles.length > 0}>
        <StepsVizSnapshotCard snapshotFiles={snapshotFiles} />
      </RenderIf>

      {/* Loading state */}
      <RenderIf condition={isFetching}>
        <div
          className="step-card animate-pulse bg-gray-100"
          style={{ order: 1000 }}
        >
          <div className="step-name text-center">Loading step files</div>
          <div className="text-subtle-1 py-18 text-center">
            {fileCount} files downloaded
          </div>
        </div>
      </RenderIf>
    </div>
  )
}