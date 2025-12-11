import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useViamClient } from './ViamClientContext';

function VideoDetailPage() {
  const { machineInfo, video_id } = useParams<{ machineInfo: string, video_id: string }>();
  const [searchParams] = useSearchParams();
  const { locationId, machineName, organizationId, viamClient } = useViamClient();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  if (!video_id) {
    return <div>Video ID is required</div>;
  }

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!viamClient) {
        return;
      }
      try {
        if (!organizationId || !locationId || !video_id) {
          return;
        }
        setLoading(true);
        const urlPath = `${organizationId}/${locationId}/${video_id}`;
        const url = await viamClient.dataClient.createBinaryDataSignedURL(urlPath, 60);
        setSignedUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
        console.error('Error fetching signed URL:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [viamClient, video_id, locationId, organizationId]);

  return (
    <div style={{ padding: '20px', width: '100%', height: '100%' }}>
      <a href={`/machine/${machineInfo}`} className="text-blue-500">Go to sanding history</a>
      <h2 className="font-semibold text-zinc-900">Sanding video</h2>
      <p><span className="font-semibold text-zinc-900">Location:</span> {locationId}</p>
      <p><span className="font-semibold text-zinc-900">Machine:</span> {machineName}</p>
      <p><span className="font-semibold text-zinc-900">File name:</span> {searchParams.get('name')}</p>

      {loading && <p>Loading video...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {signedUrl && !loading && !error && (
        <video
          ref={videoRef}
          // src={signedUrl}
          src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          controls
          style={{ width: '100%', height: '60%', maxWidth: '800px' }}
          onLoadedMetadata={() => {
            const loc = searchParams.get('loc');
            if (loc && videoRef.current) {
              const timestamp = parseFloat(loc);
              if (!isNaN(timestamp)) {
                videoRef.current.currentTime = timestamp;
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default VideoDetailPage;

