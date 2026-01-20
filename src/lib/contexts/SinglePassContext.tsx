import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
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
  allFiles: BinaryDataFile[]
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
  const {
    fetchPassFiles,
    getIsFetching,
    getIsLoaded,
    getFileCount,
    getDataFiles,
    getVideoFiles,
    getImageFiles,
  } = useFiles()

  const isFetching = useMemo(() => {
    return getIsFetching(pass.pass_id)
  }, [getIsFetching, pass.pass_id])

  const isLoaded = useMemo(() => {
    return getIsLoaded(pass.pass_id)
  }, [getIsLoaded, pass.pass_id])

  const fileCount = useMemo(() => {
    return getFileCount(pass.pass_id)
  }, [getFileCount, pass.pass_id])

  const data = useMemo(() => {
    return getDataFiles(pass.pass_id)
  }, [getDataFiles, pass.pass_id])

  const videos = useMemo(() => {
    return getVideoFiles(pass.pass_id)
  }, [getVideoFiles, pass.pass_id])

  const images = useMemo(() => {
    return getImageFiles(pass.pass_id)
  }, [getImageFiles, pass.pass_id])

  const allFiles = useMemo(() => {
    return [...data, ...videos, ...images]
  }, [data, videos, images])

  const fetchFiles = useCallback(async () => {
    await fetchPassFiles(pass)
  }, [pass, fetchPassFiles])

  useEffect(() => {
    const nextImages = getImageFiles(pass.pass_id)
    if (nextImages.length > 0) registerCameraNames(nextImages)
  }, [getImageFiles, registerCameraNames, pass.pass_id])

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
        allFiles,
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
