import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react'
import { Pass } from '../types'
import { useCamera } from './CameraContext'
import { useFiles } from './FilesContext'
import { BinaryDataFile } from '../BinaryDataFile'

interface SinglePassContextType {
  pass: Pass
  isFetching: boolean
  isLoaded: boolean
  fileCount: number
  data: BinaryDataFile[]
  videos: BinaryDataFile[]
  images: BinaryDataFile[]
  passFiles: BinaryDataFile[]
  fetchFiles: () => Promise<void>
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
  const { fetchPassFiles } = useFiles()

  const [isFetching, setIsFetching] = useState<boolean>(false)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const [data, setData] = useState<BinaryDataFile[]>([])
  const [videos, setVideos] = useState<BinaryDataFile[]>([])
  const [images, setImages] = useState<BinaryDataFile[]>([])
  const [fileCount, setFileCount] = useState<number>(0)

  const fetchFiles = useCallback(async () => {
    let dataCount = 0
    let videoCount = 0
    let imageCount = 0
    let totalFiles = 0

    setIsFetching(true)

    await fetchPassFiles(pass, (nextData, nextVideos, nextImages) => {
      if (nextData.length > 0) {
        dataCount += nextData.length
        setData((prev) => [...prev, ...nextData])
      }
      if (nextVideos.length > 0) {
        videoCount += nextVideos.length
        setVideos((prev) => [...prev, ...nextVideos])
      }
      if (nextImages.length > 0) {
        imageCount += nextImages.length
        setImages((prev) => [...prev, ...nextImages])
      }

      const nextTotalFiles =
        nextData.length + nextVideos.length + nextImages.length

      if (nextTotalFiles > 0) {
        totalFiles += nextTotalFiles
        setFileCount(totalFiles)
      }

      console.log(
        `Files fetched for pass ${pass.pass_id}`,
        `\n\tData: ${dataCount}`,
        `\n\tVideos: ${videoCount}`,
        `\n\tImages: ${imageCount}`,
        `\n\t - Total files: ${totalFiles}`
      )
    })

    setIsFetching(false)
    setIsLoaded(true)
  }, [pass, fetchPassFiles])

  useEffect(() => {
    if (images.length > 0) registerCameraNames(images)
  }, [images, registerCameraNames])

  const passFiles = useMemo(() => {
    return [...data, ...videos, ...images]
  }, [data, videos, images])

  return (
    <SinglePassContext.Provider
      value={{
        pass,
        isFetching,
        isLoaded,
        fileCount,
        data,
        videos,
        images,
        passFiles,
        fetchFiles,
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
