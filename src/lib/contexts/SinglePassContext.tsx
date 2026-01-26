import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { Pass } from '../types'
import { useCamera } from './CameraContext'
import { useFiles } from './FilesContext'
import { BinaryDataFile } from '../BinaryDataFile'
import { SNAPSHOT_FILE_NAME_PREFIX } from '../constants'

interface SinglePassContextType {
  pass: Pass

  isFetchingImages: boolean
  areImagesLoaded: boolean
  images: BinaryDataFile[]

  isFetchingVideos: boolean
  areVideosLoaded: boolean
  videos: BinaryDataFile[]

  isFetchingSnapshots: boolean
  areSnapshotsLoaded: boolean
  snapshots: BinaryDataFile[]

  isFetchingPassFiles: boolean
  arePassFilesLoaded: boolean
  passFiles: BinaryDataFile[]

  fetchStepFiles: () => Promise<void>
  fetchAllPassFiles: () => Promise<void>
  fetchVideos: (forceRefresh?: boolean) => Promise<BinaryDataFile[]>
}

const SinglePassContext = createContext<SinglePassContextType | undefined>(
  undefined
)

export function SinglePassProvider({
  pass,
  children,
}: {
  pass: Pass
  children: ReactNode
}) {
  const { registerCameraNames } = useCamera()
  const {
    fetchImages: fetchImagesFromApi,
    fetchVideos: fetchVideosFromApi,
    fetchAllPassFiles: fetchAllPassFilesFromApi,
  } = useFiles()

  const [isFetchingImages, setIsFetchingImages] = useState<boolean>(false)
  const [areImagesLoaded, setAreImagesLoaded] = useState<boolean>(false)
  const [images, setImages] = useState<BinaryDataFile[]>([])

  const [isFetchingVideos, setIsFetchingVideos] = useState<boolean>(false)
  const [areVideosLoaded, setAreVideosLoaded] = useState<boolean>(false)
  const [videos, setVideos] = useState<BinaryDataFile[]>([])

  const [isFetchingSnapshots, setIsFetchingSnapshots] = useState<boolean>(false)
  const [areSnapshotsLoaded, setAreSnapshotsLoaded] = useState<boolean>(false)
  const [snapshots, setSnapshots] = useState<BinaryDataFile[]>([])

  const [isFetchingPassFiles, setIsFetchingPassFiles] = useState<boolean>(false)
  const [arePassFilesLoaded, setArePassFilesLoaded] = useState<boolean>(false)
  const [passFiles, setPassFiles] = useState<BinaryDataFile[]>([])

  const fetchImages = useCallback(async () => {
    if (areImagesLoaded || isFetchingImages) return

    setIsFetchingImages(true)

    await fetchImagesFromApi(pass, (nextImages) => {
      if (nextImages.length > 0) {
        setImages((prev) => deduplicateFiles(prev, nextImages))
        setPassFiles((prev) => deduplicateFiles(prev, nextImages))
      }
    })

    setIsFetchingImages(false)
    setAreImagesLoaded(true)
  }, [pass, fetchImagesFromApi, areImagesLoaded, isFetchingImages])

  const fetchVideos = useCallback(
    async (forceRefresh?: boolean) => {
      if (!forceRefresh && (areVideosLoaded || isFetchingVideos)) {
        return videos
      }

      setIsFetchingVideos(true)

      const result = await fetchVideosFromApi(
        pass,
        (nextVideos) => {
          if (nextVideos.length > 0) {
            // Filter out existing videos since this call can be reinvoked after generating a video
            setVideos((prev) => deduplicateFiles(prev, nextVideos))
            setPassFiles((prev) => deduplicateFiles(prev, nextVideos))
          }
        },
        forceRefresh
      )

      setIsFetchingVideos(false)
      setAreVideosLoaded(true)
      return result
    },
    [pass, fetchVideosFromApi, areVideosLoaded, isFetchingVideos, videos]
  )

  const fetchStepFiles = useCallback(async () => {
    // Snapshots are filtered from pass files query
    await Promise.all([fetchImages(), fetchVideos()])
  }, [fetchImages, fetchVideos])

  const fetchAllPassFiles = useCallback(async () => {
    if (arePassFilesLoaded || isFetchingPassFiles) return

    setIsFetchingPassFiles(true)
    setIsFetchingSnapshots(true)

    await fetchAllPassFilesFromApi(pass, (nextFiles) => {
      if (nextFiles.length > 0) {
        // Filter snapshots from the response
        const newSnapshots = nextFiles.filter(({ fileName }) =>
          fileName.includes(SNAPSHOT_FILE_NAME_PREFIX)
        )
        if (newSnapshots.length > 0)
          setSnapshots((prev) => [...prev, ...newSnapshots])

        setPassFiles((prev) => [...prev, ...nextFiles])
      }
    })

    setIsFetchingPassFiles(false)
    setIsFetchingSnapshots(false)

    setArePassFilesLoaded(true)
    setAreSnapshotsLoaded(true)
  }, [pass, fetchAllPassFilesFromApi, arePassFilesLoaded, isFetchingPassFiles])

  // Register camera names when images are loaded
  useEffect(() => {
    if (images.length > 0) registerCameraNames(images)
  }, [images, registerCameraNames])

  return (
    <SinglePassContext.Provider
      value={{
        pass,
        isFetchingImages,
        areImagesLoaded,
        images,

        isFetchingVideos,
        areVideosLoaded,
        videos,

        isFetchingSnapshots,
        areSnapshotsLoaded,
        snapshots,

        isFetchingPassFiles,
        arePassFilesLoaded,
        passFiles,

        fetchStepFiles,
        fetchAllPassFiles,
        fetchVideos,
      }}
    >
      {children}
    </SinglePassContext.Provider>
  )
}

export function useSinglePass() {
  const context = useContext(SinglePassContext)
  if (context === undefined) {
    throw new Error('useSinglePass must be used within an SinglePassProvider')
  }
  return context
}

const deduplicateFiles = (prev: BinaryDataFile[], next: BinaryDataFile[]) => {
  const existingIds = new Set(prev.map((file) => file.binaryDataId))
  const newFiles = next.filter((file) => !existingIds.has(file.binaryDataId))
  if (newFiles.length > 0) return [...prev, ...newFiles]

  return prev
}
