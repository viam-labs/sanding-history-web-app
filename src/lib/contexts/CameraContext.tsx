import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react'
import { BinaryDataFile } from '../BinaryDataFile'

interface CameraContextType {
  selectedCamera: string
  setSelectedCamera: (camera: string) => void
  cameraComponentNames: string[]
  registerCameraNames: (imageFiles: BinaryDataFile[]) => void
}

const CameraContext = createContext<CameraContextType | undefined>(undefined)

export function CameraProvider({ children }: { children: ReactNode }) {
  const [selectedCamera, setSelectedCamera] = useState<string>(() => {
    return localStorage.getItem('selectedCamera') || ''
  })
  const [hasAutoSelectedCamera, setHasAutoSelectedCamera] = useState(false)
  const [cameraComponentNames, setCameraComponentNames] = useState<string[]>([])

  const registerCameraNames = useCallback((imageFiles: BinaryDataFile[]) => {
    const newCameraNames = imageFiles
      .filter(
        (file) =>
          file.binaryData.metadata?.captureMetadata?.componentType ===
          'rdk:component:camera'
      )
      .map((file) => file.binaryData.metadata?.captureMetadata?.componentName)
      .filter((name): name is string => !!name)

    if (newCameraNames.length === 0) return

    setCameraComponentNames((prevNames) => {
      const combined = [...prevNames, ...newCameraNames]
      const unique = Array.from(new Set(combined))
      return unique
    })
  }, [])

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
      value={{
        selectedCamera,
        setSelectedCamera,
        cameraComponentNames,
        registerCameraNames,
      }}
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
