import { getBeforeAfterImages } from '../../lib/passUtils'
import { Pass } from '../../lib/types'
import { formatTimeDifference } from '../../lib/videoUtils'
import ImageDisplay from '../ImageDisplay'
import { useCamera } from '../../lib/contexts/CameraContext'
import { useModal, ModalType } from '../../lib/contexts/ModalContext'
import { useEffect, useState } from 'react'
import { useSinglePass } from '../../lib/contexts/SinglePassContext'
import { BinaryDataFile } from '../../lib/BinaryDataFile'

interface StepImagesGridProps {
  pass: Pass
}

export const StepImagesGrid = ({ pass }: StepImagesGridProps) => {
  const { isLoaded, images } = useSinglePass()
  const { selectedCamera } = useCamera()
  const { openModal } = useModal()

  const [before, setBefore] = useState<BinaryDataFile | null>(null)
  const [after, setAfter] = useState<BinaryDataFile | null>(null)

  useEffect(() => {
    const { beforeImage, afterImage } = getBeforeAfterImages(
      pass,
      images,
      selectedCamera
    )

    if (beforeImage && !before) {
      setBefore(beforeImage)
    }

    if (afterImage && !after) {
      setAfter(afterImage)
    }
  }, [pass, images, selectedCamera, before, after])

  // If no images at all, show a message
  if (!before && !after && isLoaded) {
    return (
      <div className="step-card order-none">
        <div className="flex h-full items-center justify-center bg-gray-100 rounded p-3 text-gray-400 text-sm">
          No images captured during this pass
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Start Image */}
      {before && (
        <div className="step-card -order-1">
          <div className="step-name">Start Image</div>
          <div className="step-duration">
            {before.timeRequested?.toLocaleTimeString()}
            <span className="text-xs text-gray-500 ml-2">
              (
              {formatTimeDifference(
                before.timeRequested?.getTime() || pass.start.getTime(),
                pass.start.getTime()
              )}{' '}
              from start)
            </span>
          </div>

          <div
            className="step-image-container clickable-image mt-3 w-full overflow-hidden"
            onClick={() =>
              openModal({
                type: ModalType.BEFORE_AFTER,
                beforeImage: before,
                afterImage: after,
              })
            }
          >
            <ImageDisplay binaryData={before} />
          </div>
        </div>
      )}

      {/* End Image */}
      {after && after !== before && (
        <div className="step-card order-[999]">
          <div className="step-name">End Image</div>
          <div className="step-duration">
            {after.timeRequested?.toLocaleTimeString()}
            <span className="text-xs text-gray-500 ml-2">
              (
              {formatTimeDifference(
                pass.end.getTime(),
                after.timeRequested?.getTime() || pass.end.getTime()
              )}{' '}
              before end)
            </span>
          </div>

          <div
            className="step-image-container clickable-image mt-3 w-full overflow-hidden"
            onClick={() =>
              openModal({
                type: ModalType.BEFORE_AFTER,
                beforeImage: before,
                afterImage: after,
              })
            }
          >
            <ImageDisplay binaryData={after} />
          </div>
        </div>
      )}
    </>
  )
}
