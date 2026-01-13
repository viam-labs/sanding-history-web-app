import React, { useState, useEffect, useRef } from 'react'
import * as VIAM from '@viamrobotics/sdk'
import VideoModal from './VideoModal'
import { Step } from '../lib/types'
import { generateVideo, getVideoStoreName } from '../lib/videoUtils'
import { VideoPollingManager } from '../lib/videoPollingManager'
import { constructStepLogUrl } from '../lib/uiUtils'
import { useToast } from '../lib/contexts/ToastContext'
import { useMemo } from 'react'
import { useVideoStore } from '../lib/contexts/VideoStoreContext'

interface StepVideosGridProps {
  stepVideos: VIAM.dataApi.BinaryData[]
  videoFiles: Map<string, VIAM.dataApi.BinaryData>
  step: Step
  fetchVideos: (start: Date, shouldSetLoadingState: boolean) => Promise<void>
  fetchTimestamp: Date | null
  machineId: string
  organizationId: string
}

const StepVideosGrid: React.FC<StepVideosGridProps> = ({
  stepVideos,
  videoFiles,
  step,
  fetchVideos,
  fetchTimestamp,
  machineId,
  organizationId,
}) => {
  const [selectedVideo, setSelectedVideo] =
    useState<VIAM.dataApi.BinaryData | null>(null)
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null)
  const { addMessage } = useToast()
  const [isPolling, setIsPolling] = useState<boolean>(false)
  const requestIdRef = useRef<string | null>(null)
  const pollingManager = VideoPollingManager.getInstance()
  const { videoStoreClient } = useVideoStore()

  // Add CSS keyframes for spinner animation
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Register this step's fetch function with the polling manager when generating
  // The polling manager will use the most recent fetchVideos function set
  const registerFetchForPolling = () => {
    pollingManager.setFetchData(() => fetchVideos(step.start, false))
  }

  // Update polling manager whenever videoFiles changes
  useEffect(() => {
    pollingManager.updateCurrentVideos(videoFiles)
    pollingManager.forceVideoCheck()
  }, [videoFiles])

  const hasVideosForVideoStore = useMemo(() => {
    return stepVideos.some(
      (video) => getVideoStoreName(video) === videoStoreClient?.name
    )
  }, [stepVideos, videoStoreClient])

  // Stop polling if videos are now available (handles the case where video appears)
  useEffect(() => {
    if (hasVideosForVideoStore && isPolling) {
      setIsPolling(false)
      if (requestIdRef.current) {
        pollingManager.removeRequest(requestIdRef.current)
        requestIdRef.current = null
      }
    }
  }, [hasVideosForVideoStore, isPolling])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (requestIdRef.current) {
        pollingManager.removeRequest(requestIdRef.current)
      }
    }
  }, [])

  const handleVideoClick = (video: VIAM.dataApi.BinaryData) => {
    setSelectedVideo(video)
  }

  const closeVideoModal = () => {
    // Clean up video URL if it exists
    if (modalVideoUrl && modalVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(modalVideoUrl)
    }
    setSelectedVideo(null)
    setModalVideoUrl(null)
  }

  const handleGenerateVideo = async () => {
    if (!videoStoreClient) {
      console.error('No video store client available')
      return
    }

    // Register fetch function for this step's time range
    registerFetchForPolling()

    setIsPolling(true)

    try {
      // Start video generation
      await generateVideo(videoStoreClient, step)

      if (!videoStoreClient.name) {
        const errorMessage = 'No video store name available'
        console.error(errorMessage)
        addMessage({ message: errorMessage, type: 'error' })
        throw new Error(errorMessage)
      }

      // Add to polling manager
      requestIdRef.current = pollingManager.addRequest(
        step,
        videoStoreClient.name,
        () => {
          setIsPolling(false)
        }
      )
    } catch (error) {
      console.error('Error generating video:', error)
      addMessage({ message: `Error generating video: ${error}`, type: 'error' })
      setIsPolling(false)
    }
  }

  const isLoading =
    stepVideos.length === 0 && fetchTimestamp && fetchTimestamp > step.start
  const showLogsLink =
    machineId &&
    organizationId &&
    step.end.getTime() - step.start.getTime() >= 1000

  return (
    <>
      {/* Loading state */}
      {isLoading && (
        <div
          className="loading-state"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            color: '#6b7280',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '8px',
            }}
          />
          <div style={{ fontSize: '14px' }}>Loading videos...</div>
        </div>
      )}

      {/* Generate video button */}
      {!hasVideosForVideoStore && !isLoading && (
        <div
          className="generate-video"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '18px',
          }}
        >
          <button
            type="button"
            className="generate-video-button"
            onClick={() => handleGenerateVideo()}
            disabled={videoStoreClient == null || isPolling}
            style={{
              padding: '6px 8px',
              fontSize: '12px',
              backgroundColor:
                videoStoreClient == null || isPolling ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor:
                videoStoreClient == null || isPolling
                  ? 'not-allowed'
                  : 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              if (videoStoreClient && !isPolling) {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }
            }}
            onMouseLeave={(e) => {
              if (videoStoreClient && !isPolling) {
                e.currentTarget.style.backgroundColor = '#3b82f6'
              }
            }}
          >
            {isPolling ? (
              <>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Generating...
              </>
            ) : (
              'Generate Video'
            )}
          </button>
          {isPolling && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center',
              }}
            >
              This can take up to a minute.
            </div>
          )}
        </div>
      )}

      {/* Videos grid */}
      {stepVideos.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '8px 0',
          }}
        >
          {stepVideos.map((video) => {
            const videoStoreName = getVideoStoreName(video)
            return (
              <div
                key={video.metadata?.fileName}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  minWidth: '200px',
                  maxWidth: '320px',
                }}
              >
                {/* Video store badge */}
                <div
                  style={{
                    fontSize: '8px',
                    fontWeight: 600,
                    color: '#64748b',
                    backgroundColor: '#e2e8f0',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                  }}
                  title={`Video from: ${videoStoreName}`}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>🎬</span>
                  <span
                    style={{
                      marginLeft: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {videoStoreName}
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleVideoClick(video)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6'
                    }}
                  >
                    Play
                  </button>
                  {video.metadata?.uri && (
                    <a
                      href={video.metadata.uri}
                      download={
                        video.metadata?.fileName?.split('/').pop() ||
                        'video.mp4'
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '11px',
                        fontWeight: 500,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        border: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#059669'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#10b981'
                      }}
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Logs link - shared across all states */}
      {showLogsLink && (
        <a
          href={constructStepLogUrl(
            step.start,
            step.end,
            machineId,
            organizationId
          )}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginTop: '8px',
            color: '#3b82f6',
            fontSize: '12px',
            textDecoration: 'underline',
            textAlign: 'center',
          }}
        >
          View logs for this step
        </a>
      )}

      <VideoModal selectedVideo={selectedVideo} onClose={closeVideoModal} />
    </>
  )
}

export default StepVideosGrid
