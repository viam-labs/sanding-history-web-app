import { useViamClients } from '../lib/contexts/ViamClientContext'
import VideoStoreSelector from './VideoStoreSelector'
import { useCamera } from '../lib/contexts/CameraContext'
import { useVideoStore } from '../lib/contexts/VideoStoreContext'

export const ResourceSelection: React.FC = () => {
  const { robotClient, machineName } = useViamClients()
  const { selectedCamera, cameraComponentNames, setSelectedCamera } =
    useCamera()
  const { setVideoStoreClient } = useVideoStore()
  return (
    <div className="flex gap-8">
      {machineName && (
        <div className="video-store-selector">
          <div className="video-store-selector-label mb-2.5">Machine name</div>
          <div>
            <span className="inline-block bg-gray-100 text-zinc-800 px-3 py-2 rounded-md text-sm font-semibold">
              {machineName}
            </span>
          </div>
        </div>
      )}

      <VideoStoreSelector onVideoStoreSelected={setVideoStoreClient} />

      <div className="video-store-selector">
        <label htmlFor="camera-select" className="video-store-selector-label">
          Select camera resource
        </label>
        {!robotClient ? (
          <div className="video-store-selector-message info">
            Connect to a robot to select a camera
          </div>
        ) : cameraComponentNames.length > 0 ? (
          <select
            id="camera-select"
            value={selectedCamera}
            onChange={(e) => {
              setSelectedCamera(e.target.value)
              localStorage.setItem('selectedCamera', e.target.value)
            }}
            className="video-store-selector-select"
          >
            <option value="">Select a camera resource</option>
            {cameraComponentNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <div className="video-store-selector-message info">
            No camera resources found
          </div>
        )}
      </div>
    </div>
  )
}
