import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
  useRef,
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
  cancelFetch: () => void
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

  const abortControllerRef = useRef<AbortController | null>(null)

  const cancelFetch = useCallback(() => {
    if (abortControllerRef.current) {
      console.log(`Cancelled fetching files for pass ${pass.pass_id}`)
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setIsFetchingImages(false)
    setIsFetchingPassFiles(false)
    setIsFetchingSnapshots(false)
  }, [pass.pass_id])

  useEffect(() => {
    return () => {
      if (!abortControllerRef.current) return
      abortControllerRef.current.abort()
    }
  }, [])

  const fetchImages = useCallback(async () => {
    if (areImagesLoaded || isFetchingImages) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsFetchingImages(true)

    await fetchImagesFromApi(
      pass,
      (nextImages) => {
        if (controller.signal.aborted) return
        if (nextImages.length === 0) return

        setImages((prev) => deduplicateFiles(prev, nextImages))
        setPassFiles((prev) => deduplicateFiles(prev, nextImages))
      },
      controller.signal
    )

    if (!controller.signal.aborted) {
      console.log(`Fetched images for pass ${pass.pass_id}`)
      setIsFetchingImages(false)
      setAreImagesLoaded(true)
    }
  }, [pass, fetchImagesFromApi, areImagesLoaded, isFetchingImages])

  const fetchVideos = useCallback(
    async (forceRefresh?: boolean) => {
      if (!forceRefresh && (areVideosLoaded || isFetchingVideos)) return videos

      setIsFetchingVideos(true)

      await fetchVideosFromApi(
        pass,
        (nextVideos) => {
          if (nextVideos.length === 0) return

          setVideos((prev) => deduplicateFiles(prev, nextVideos))
          setPassFiles((prev) => deduplicateFiles(prev, nextVideos))
        },
        forceRefresh
      )

      console.log(`Fetched videos for pass ${pass.pass_id}`)
      setIsFetchingVideos(false)
      setAreVideosLoaded(true)
      return videos
    },
    [pass, fetchVideosFromApi, areVideosLoaded, isFetchingVideos, videos]
  )

  const fetchStepFiles = useCallback(async () => {
    // Snapshots are filtered from pass files query
    await Promise.all([fetchImages(), fetchVideos()])
  }, [fetchImages, fetchVideos])

  const fetchAllPassFiles = useCallback(async () => {
    if (arePassFilesLoaded || isFetchingPassFiles) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsFetchingPassFiles(true)
    setIsFetchingSnapshots(true)

    await fetchAllPassFilesFromApi(
      pass,
      (nextFiles) => {
        if (controller.signal.aborted) return
        if (nextFiles.length === 0) return

        const newSnapshots = nextFiles.filter((file) =>
          file.fileName.includes(SNAPSHOT_FILE_NAME_PREFIX)
        )
        if (newSnapshots.length !== 0) {
          setSnapshots((prev) => deduplicateFiles(prev, newSnapshots))
        }
        setPassFiles((prev) => deduplicateFiles(prev, nextFiles))
      },
      controller.signal
    )

    if (!controller.signal.aborted) {
      console.log(`Fetched all files for pass ${pass.pass_id}`)
      setIsFetchingPassFiles(false)
      setIsFetchingSnapshots(false)

      setArePassFilesLoaded(true)
      setAreSnapshotsLoaded(true)
    }
  }, [pass, fetchAllPassFilesFromApi, arePassFilesLoaded, isFetchingPassFiles])

  useEffect(() => {
    // Register camera names when images are loaded
    if (images.length === 0) return
    registerCameraNames(images)
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
        cancelFetch,
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
