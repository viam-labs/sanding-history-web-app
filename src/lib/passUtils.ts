import { Pass, Step } from './types'


import { BinaryDataFile } from './BinaryDataFile'

/**
 * Get before and after images for a given pass from a list of image files.
 * @param pass - The pass object.
 * @param imageFiles - A map of all available image files.
 * @param selectedCamera - The name of the camera to filter images by.
 * @returns An object containing the before and after image, or null.
 */
export const getBeforeAfterImages = (
  pass: Pass,
  imageFiles: BinaryDataFile[],
  selectedCamera: string
): {
  beforeImage: BinaryDataFile | null
  afterImage: BinaryDataFile | null
} => {
  const passStart = new Date(pass.start)
  const passEnd = new Date(pass.end)

  const allCameraImages = imageFiles
    .filter((file) => {
      if (
        file.captureMetadata?.componentName !== selectedCamera ||
        !file.timeRequested
      ) {
        return false
      }

      const imgTime = file.timeRequested
      // Only consider images within the pass time range
      return imgTime >= passStart && imgTime <= passEnd
    })
    .sort((a, b) => a.timeRequested!.getTime() - b.timeRequested!.getTime())

  // Get the first image in the pass (closest to start)
  const beforeImage = allCameraImages[0]

  // Get the last image in the pass (closest to end)
  const afterImage = allCameraImages[allCameraImages.length - 1]

  return {
    beforeImage: beforeImage || null,
    afterImage: afterImage || null,
  }
}

/**
 * Get all videos associated with a specific step.
 * @param step - The step object.
 * @param videoFiles - A map of all available video files.
 * @returns An object with fullVideos and last30sVideos arrays.
 */
export const getStepVideos = (
  step: Step,
  videoFiles: BinaryDataFile[]
): { fullVideos: BinaryDataFile[]; last30sVideos: BinaryDataFile[] } => {
  if (!videoFiles || videoFiles.length === 0) return { fullVideos: [], last30sVideos: [] }

  const fullVideos: BinaryDataFile[] = []
  const last30sVideos: BinaryDataFile[] = []

  videoFiles.forEach((file) => {
    if (!file.fileName) return

    // TODO: add a tag for these 30 second videos when videoStore DoCommand is updaated
    const isLast30s = file.fileName.includes('_last30s_')

    // 1. Try matching by metadata in filename (pass_id and step name)
    const hasMetadataMatch =
      file.fileName.includes(step.pass_id) && file.fileName.includes(step.name)

    if (hasMetadataMatch) {
      if (isLast30s) {
        last30sVideos.push(file)
      } else {
        fullVideos.push(file)
      }
      return
    }

    // 2. Try matching by timestamp in filename (only for full videos, not last30s)
    if (!isLast30s) {
      const videoTime = file.getFileTimestamp()
      if (videoTime) {
        const stepEnd = step.end.getTime()
        const vidTime = videoTime.getTime()

        // The video timestamp is typically step.end + 10s buffer
        const windowMs = 10_000
        if (Math.abs(vidTime - stepEnd) < windowMs) {
          fullVideos.push(file)
        }
      }
    }
  })

  return { fullVideos, last30sVideos }
}

// Compute total execution time (ms) for a pass by summing 'executing' steps
export const getExecutionTimeMs = (pass: Pass): number => {
  if (!pass.steps || pass.steps.length === 0) return 0
  return pass.steps.reduce((sum, step) => {
    return step.name.toLowerCase() === 'executing'
      ? sum + (step.end.getTime() - step.start.getTime())
      : sum
  }, 0)
}
