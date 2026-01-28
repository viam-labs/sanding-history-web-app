import { Step } from '../../lib/types'
import RenderIf from '../RenderIf'
import { StepImagesGrid } from './StepImagesGrid'
import StepVideosGrid from './StepVideosGrid.tsx'
import { formatDurationToMinutesSeconds } from '../../lib/videoUtils'
import { StepsVizSnapshotCard } from './StepsVizSnapshotCard'
import { useCamera } from '../../lib/contexts/CameraContext'
import { useSinglePass } from '../../lib/contexts/SinglePassContext'

export const StepsGrid = () => {
  const {
    pass,
    passFiles,
    areImagesLoaded,
    areVideosLoaded,
    areSnapshotsLoaded,
  } = useSinglePass()

  const { selectedCamera } = useCamera()

  return (
    <div className="steps-grid">
      {/* Camera Images */}
      <RenderIf condition={selectedCamera !== ''}>
        <StepImagesGrid />
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
      <StepsVizSnapshotCard />

      {/* Loading state */}
      <RenderIf
        condition={!areImagesLoaded || !areVideosLoaded || !areSnapshotsLoaded}
      >
        <div
          className="step-card animate-pulse bg-gray-100"
          style={{ order: 1000 }}
        >
          <div className="step-name text-center">Loading pass files</div>
          <div className="text-subtle-1 py-18 text-center">
            {passFiles.length} files downloaded
          </div>
        </div>
      </RenderIf>
    </div>
  )
}
