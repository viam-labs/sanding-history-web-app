import { createContext, useContext, useState, ReactNode } from 'react'
import { BinaryDataFile } from '../BinaryDataFile'

interface VideoModalContextType {
  selectedVideo: BinaryDataFile | null
  setSelectedVideo: (video: BinaryDataFile | null) => void
}

const VideoModalContext = createContext<VideoModalContextType | undefined>(
  undefined
)

export function VideoModalProvider({ children }: { children: ReactNode }) {
  const [selectedVideo, setSelectedVideo] = useState<BinaryDataFile | null>(
    null
  )

  return (
    <VideoModalContext.Provider value={{ selectedVideo, setSelectedVideo }}>
      {children}
    </VideoModalContext.Provider>
  )
}

export function useVideoModal() {
  const context = useContext(VideoModalContext)
  if (context === undefined) {
    throw new Error('useVideoModal must be used within a VideoModalProvider')
  }
  return context
}
