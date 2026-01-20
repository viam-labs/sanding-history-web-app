import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react'
import { useViamClients } from './ViamClientContext'
import { Pass } from '../types'
import { FileQueryManager } from '../FileQueryManager'
import { BinaryDataFile } from '../BinaryDataFile'

interface FilesContextType {
  getIsFetching: (passId: string) => boolean
  getIsLoaded: (passId: string) => boolean
  getFileCount: (passId: string) => number
  getDataFiles: (passId: string) => BinaryDataFile[]
  getVideoFiles: (passId: string) => BinaryDataFile[]
  getImageFiles: (passId: string) => BinaryDataFile[]
  fetchPassFiles: (pass: Pass) => Promise<void>
}

const FilesContext = createContext<FilesContextType | undefined>(undefined)

export function FilesProvider({ children }: { children: ReactNode }) {
  const { viamClient, machineId } = useViamClients()

  const queryManager = useRef<FileQueryManager>(new FileQueryManager())

  const [fetchingPasses, setFetchingPasses] = useState<Set<string>>(new Set())
  const [loadedPasses, setLoadedPasses] = useState<Set<string>>(new Set())
  const [fileCounts, setFileCounts] = useState<Map<string, number>>(new Map())

  const [dataFiles, setDataFiles] = useState<Map<string, BinaryDataFile[]>>(
    new Map()
  )
  const [videoFiles, setVideoFiles] = useState<Map<string, BinaryDataFile[]>>(
    new Map()
  )
  const [imageFiles, setImageFiles] = useState<Map<string, BinaryDataFile[]>>(
    new Map()
  )

  const getIsFetching = useCallback(
    (passId: string) => {
      return fetchingPasses.has(passId)
    },
    [fetchingPasses]
  )

  const getIsLoaded = useCallback(
    (passId: string) => {
      return loadedPasses.has(passId)
    },
    [loadedPasses]
  )

  const getFileCount = useCallback(
    (passId: string) => {
      return fileCounts.get(passId) ?? 0
    },
    [fileCounts]
  )

  const getDataFiles = useCallback(
    (passId: string) => {
      return dataFiles.get(passId) ?? []
    },
    [dataFiles]
  )

  const getVideoFiles = useCallback(
    (passId: string) => {
      return videoFiles.get(passId) ?? []
    },
    [videoFiles]
  )

  const getImageFiles = useCallback(
    (passId: string) => {
      return imageFiles.get(passId) ?? []
    },
    [imageFiles]
  )

  const fetchPassFiles = useCallback(
    async (pass: Pass) => {
      const passId = pass.pass_id
      if (loadedPasses.has(passId) || fetchingPasses.has(passId)) {
        return
      }

      setFetchingPasses((prev) => new Set([...prev, passId]))
      let dataCount = 0
      let videoCount = 0
      let imageCount = 0
      let totalFiles = 0

      try {
        console.log(`Fetching files for pass ${passId}`)

        await queryManager.current.queryFiles({
          machineId,
          viamClient,
          passId,
          start: pass.start,
          end: pass.end,
          onQuery: (
            passId: string,
            nextData: BinaryDataFile[],
            nextVideos: BinaryDataFile[],
            nextImages: BinaryDataFile[]
          ) => {
            if (nextData.length > 0) {
              dataCount += nextData.length
              setDataFiles((prev) => {
                const existing = prev.get(passId) ?? []
                return new Map([...prev, [passId, [...existing, ...nextData]]])
              })
            }
            if (nextVideos.length > 0) {
              videoCount += nextVideos.length
              setVideoFiles((prev) => {
                const existing = prev.get(passId) ?? []
                return new Map([
                  ...prev,
                  [passId, [...existing, ...nextVideos]],
                ])
              })
            }
            if (nextImages.length > 0) {
              imageCount += nextImages.length
              setImageFiles((prev) => {
                const existing = prev.get(passId) ?? []
                return new Map([
                  ...prev,
                  [passId, [...existing, ...nextImages]],
                ])
              })
            }

            const nextTotalFiles =
              nextData.length + nextVideos.length + nextImages.length

            if (nextTotalFiles > 0) {
              totalFiles += nextTotalFiles
              setFileCounts((prev) => new Map([...prev, [passId, totalFiles]]))
            }
          },
        })

        console.log(
          `Files fetched for pass ${passId}`,
          `\n\tData: ${dataCount}`,
          `\n\tVideos: ${videoCount}`,
          `\n\tImages: ${imageCount}`,
          `\n\t - Total files: ${totalFiles}`
        )

        setLoadedPasses((prev) => new Set([...prev, passId]))
      } finally {
        setFetchingPasses((prev) => {
          const next = new Set(prev)
          next.delete(passId)
          return next
        })
      }
    },
    [machineId, viamClient, loadedPasses, fetchingPasses]
  )

  return (
    <FilesContext.Provider
      value={{
        getIsFetching,
        getIsLoaded,
        getFileCount,
        getDataFiles,
        getVideoFiles,
        getImageFiles,
        fetchPassFiles,
      }}
    >
      {children}
    </FilesContext.Provider>
  )
}

export function useFiles() {
  const context = useContext(FilesContext)
  if (context === undefined) {
    throw new Error('useFiles must be used within an FilesProvider')
  }
  return context
}
