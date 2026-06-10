import { createContext, useContext, useState, ReactNode } from 'react'
import * as VIAM from '@viamrobotics/sdk'

/**
 * A video store may be backed by either a generic component
 * (`rdk:component:generic`) or a video service (`rdk:service:video`). Each has
 * its own SDK client routing to the matching gRPC API, but both expose the only
 * members we use here — `name` and `doCommand` — so we keep both in the union.
 */
export type VideoStoreClient = VIAM.GenericComponentClient | VIAM.VideoClient

interface VideoStoreContextType {
  videoStoreClient: VideoStoreClient | null
  setVideoStoreClient: (client: VideoStoreClient | null) => void
}

const VideoStoreContext = createContext<VideoStoreContextType | undefined>(
  undefined
)

export function VideoStoreProvider({ children }: { children: ReactNode }) {
  const [videoStoreClient, setVideoStoreClient] =
    useState<VideoStoreClient | null>(null)

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
