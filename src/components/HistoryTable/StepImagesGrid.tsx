import { getBeforeAfterImages } from '../../lib/passUtils'
import { Pass } from '../../lib/types'
import { formatTimeDifference } from '../../lib/videoUtils'
import ImageDisplay from '../ImageDisplay'
import { useFiles } from '../../lib/contexts/FilesContext'
import { useCamera } from '../../lib/contexts/CameraContext'
import { useModal, ModalType } from '../../lib/contexts/ModalContext'

interface StepImagesGridProps {
  pass: Pass
}

export const StepImagesGrid = ({ pass }: StepImagesGridProps) => {
  const { imageFiles } = useFiles()
  const { selectedCamera } = useCamera()
  const { openModal } = useModal()
  const { beforeImage, afterImage } = getBeforeAfterImages(
    pass,
    imageFiles,
    selectedCamera
  )
  const passStart = pass.start
  const passEnd = pass.end

  // If no images at all, show a message
  if (!beforeImage && !afterImage) {
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
      {beforeImage && (
        <div className="step-card -order-1">
          <div className="step-name">Start Image</div>
          <div className="step-duration">
            {beforeImage.metadata?.timeRequested?.toDate().toLocaleTimeString()}
            <span className="text-xs text-gray-500 ml-2">
              (
              {formatTimeDifference(
                beforeImage.metadata?.timeRequested?.toDate()?.getTime() ||
                  passStart.getTime(),
                passStart.getTime()
              )}{' '}
              from start)
            </span>
          </div>

          <div
            className="step-image-container clickable-image mt-3 w-full overflow-hidden"
            onClick={() =>
              openModal({
                type: ModalType.BEFORE_AFTER,
                beforeImage: beforeImage,
                afterImage: afterImage,
              })
            }
          >
            <ImageDisplay binaryData={beforeImage} />
          </div>
        </div>
      )}

      {/* End Image */}
      {afterImage && afterImage !== beforeImage && (
        <div className="step-card order-[999]">
          <div className="step-name">End Image</div>
          <div className="step-duration">
            {afterImage.metadata?.timeRequested?.toDate().toLocaleTimeString()}
            <span className="text-xs text-gray-500 ml-2">
              (
              {formatTimeDifference(
                passEnd.getTime(),
                afterImage.metadata?.timeRequested?.toDate()?.getTime() ||
                  passEnd.getTime()
              )}{' '}
              before end)
            </span>
          </div>

          <div
            className="step-image-container clickable-image mt-3 w-full overflow-hidden"
            onClick={() =>
              openModal({
                type: ModalType.BEFORE_AFTER,
                beforeImage: beforeImage,
                afterImage: afterImage,
              })
            }
          >
            <ImageDisplay binaryData={afterImage} />
          </div>
        </div>
      )}
    </>
  )
}
