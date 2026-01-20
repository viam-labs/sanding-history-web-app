import React, { useRef, useState, useEffect } from 'react'

import { useViamClients } from '../lib/contexts/ViamClientContext'
import VideoShareButtons from './VideoShareButtons'
import { BinaryDataFile } from '../lib/BinaryDataFile'

interface VideoModalProps {
  selectedVideo: BinaryDataFile | null
  onClose: () => void
}

const VideoModal: React.FC<VideoModalProps> = ({ selectedVideo, onClose }) => {
  const { viamClient } = useViamClients()

  const videoRef = useRef<HTMLVideoElement>(null)

  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null)
  const [loadingModalVideo, setLoadingModalVideo] = useState(false)

  const videoPageURL = React.useMemo(() => {
    if (!selectedVideo) {
      return ''
    }

    const videoId = selectedVideo.binaryDataId.split('/').pop()
    const fileName = selectedVideo.fileName
    const baseUrl = `${window.location.origin}${window.location.pathname}`

    return `${baseUrl}#/videos/${videoId}?name=${encodeURIComponent(fileName)}`
  }, [selectedVideo])

  const closeVideoModal = () => {
    setModalVideoUrl(null)
    onClose()
  }

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeVideoModal()
      }
    }

    if (selectedVideo) {
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [selectedVideo])

  // Fetch video when selectedVideo changes
  useEffect(() => {
    if (selectedVideo) {
      const fetchVideoURL = async () => {
        setLoadingModalVideo(true)
        try {
          console.log(
            'creating signed URL for video',
            selectedVideo.binaryDataId
          )
          const url = await viamClient.dataClient.createBinaryDataSignedURL(
            selectedVideo.binaryDataId,
            60
          )
          setModalVideoUrl(url)
        } catch (error) {
          console.error('Error creating signed URL for video:', error)
        } finally {
          setLoadingModalVideo(false)
        }
      }

      fetchVideoURL()
    }
  }, [selectedVideo, viamClient])

  if (!selectedVideo) {
    return null
  }

  return (
    <div className="video-modal-overlay" onClick={closeVideoModal}>
      <div className="video-modal" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-header">
          <button className="video-modal-close" onClick={closeVideoModal}>
            ×
          </button>
        </div>

        <div className="video-modal-content">
          <div className="video-modal-player">
            {loadingModalVideo ? (
              <>
                <div className="loading-spinner">⏳</div>
                <p>Loading video...</p>
              </>
            ) : modalVideoUrl ? (
              <video
                ref={videoRef}
                controls
                autoPlay
                src={modalVideoUrl}
                className="w-full h-full rounded-lg"
                onError={(e) => {
                  console.error('Video playback error:', e)
                  alert('Error playing video')
                }}
              />
            ) : (
              <>
                <div className="loading-spinner">⏳</div>
                <p>Loading video...</p>
              </>
            )}
          </div>

          <div className="video-modal-info">
            <VideoShareButtons baseUrl={videoPageURL} videoRef={videoRef}>
              <a
                href={videoPageURL}
                className="text-blue-500"
                target="_blank"
                title="Go to the video's detail page"
                rel="noreferrer"
              >
                Go to video
              </a>
            </VideoShareButtons>

            <p>
              <strong>File:</strong>{' '}
              {selectedVideo.uri ? (
                <a
                  href={selectedVideo.uri}
                  download={
                    selectedVideo.fileName?.split('/').pop() || 'video.mp4'
                  }
                  className="text-blue-500 underline cursor-pointer hover:text-blue-600"
                >
                  {selectedVideo.fileName || 'Unknown'}
                </a>
              ) : (
                selectedVideo.fileName || 'Unknown'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoModal
