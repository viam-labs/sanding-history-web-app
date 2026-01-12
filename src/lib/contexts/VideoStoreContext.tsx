import { createContext, useContext, useState, ReactNode } from 'react'
import * as VIAM from '@viamrobotics/sdk'

interface VideoStoreContextType {
  videoStoreClient: VIAM.GenericComponentClient | null
  setVideoStoreClient: (client: VIAM.GenericComponentClient | null) => void
}

const VideoStoreContext = createContext<VideoStoreContextType | undefined>(
  undefined
)

export function VideoStoreProvider({ children }: { children: ReactNode }) {
  const [videoStoreClient, setVideoStoreClient] =
    useState<VIAM.GenericComponentClient | null>(null)

  return (
    <VideoStoreContext.Provider
      value={{ videoStoreClient, setVideoStoreClient }}
    >
      {children}
    </VideoStoreContext.Provider>
  )
}

export function useVideoStore() {
  const context = useContext(VideoStoreContext)
  if (context === undefined) {
    throw new Error('useVideoStore must be used within an VideoStoreProvider')
  }
  return context
}
