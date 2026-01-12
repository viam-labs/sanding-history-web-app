import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react'
import { useFiles } from './FilesContext'

interface CameraContextType {
  selectedCamera: string
  setSelectedCamera: (camera: string) => void
  cameraComponentNames: string[]
}

const CameraContext = createContext<CameraContextType | undefined>(undefined)

export function CameraProvider({ children }: { children: ReactNode }) {
  const { imageFiles } = useFiles()
  const [selectedCamera, setSelectedCamera] = useState<string>(() => {
    return localStorage.getItem('selectedCamera') || ''
  })
  const [hasAutoSelectedCamera, setHasAutoSelectedCamera] = useState(false)
  const [cameraComponentNames, setCameraComponentNames] = useState<string[]>([])

  useEffect(() => {
    const names = Array.from(
      new Set(
        Array.from(imageFiles.values())
          .filter(
            (file) =>
              file.metadata?.captureMetadata?.componentType ===
              'rdk:component:camera'
          )
          .map((file) => file.metadata?.captureMetadata?.componentName)
          .filter((name): name is string => !!name)
      )
    )
    setCameraComponentNames(names)
  }, [imageFiles])

  useEffect(() => {
    if (cameraComponentNames.length === 0 || hasAutoSelectedCamera) return

    // Mark that we've done the auto-selection
    setHasAutoSelectedCamera(true)

    // If only one camera, auto-select it
    if (cameraComponentNames.length === 1) {
      const onlyCamera = cameraComponentNames[0]
      setSelectedCamera(onlyCamera)
      localStorage.setItem('selectedCamera', onlyCamera)
      return
    }

    // If multiple cameras, try to restore from localStorage
    const savedCamera = localStorage.getItem('selectedCamera')
    if (savedCamera && cameraComponentNames.includes(savedCamera)) {
      setSelectedCamera(savedCamera)
    }
  }, [cameraComponentNames, hasAutoSelectedCamera])

  return (
    <CameraContext.Provider
      value={{ selectedCamera, setSelectedCamera, cameraComponentNames }}
    >
      {children}
    </CameraContext.Provider>
  )
}

export function useCamera() {
  const context = useContext(CameraContext)
  if (context === undefined) {
    throw new Error('useCamera must be used within an CameraProvider')
  }
  return context
}
