import { useParams, useNavigate } from 'react-router-dom';

interface VideoDetailPageProps {
  // Add any props you need from the parent
}

function VideoDetailPage() {
  const { video_id } = useParams<{ machineInfo: string, video_id: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Video Detail</h1>
      <p>Video ID: {video_id}</p>
      <video src={video_id} controls />
    </div>
  );
}

export default VideoDetailPage;

