import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useViamClient } from './ViamClientContext';

function VideoDetailPage() {
  const { video_id } = useParams<{ machineInfo: string, video_id: string }>();
  const navigate = useNavigate();
  const { locationId, organizationId, viamClient } = useViamClient();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <h1>Video Detail</h1>
      <p>Video ID: {video_id}</p>

      {loading && <p>Loading video...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {signedUrl && !loading && !error && (
        <video src={signedUrl} controls style={{ width: '100%', height: '60%', maxWidth: '800px' }} />
      )}
    </div>
  );
}

export default VideoDetailPage;

