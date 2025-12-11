import { Routes, Route } from 'react-router-dom';
import MainListPage from './MainListPage';
import VideoDetailPage from './VideoDetailPage';

function App() {
  return (
    <Routes>
      {/* Main list view - matches /machine/:machineInfo */}
      <Route path="/machine/:machineInfo" element={<MainListPage />} />
      
      {/* Video detail view - matches /machine/:machineInfo/videos/:video_id */}
      <Route path="/machine/:machineInfo/videos/:video_id" element={<VideoDetailPage />} />
    </Routes>
  );
}

export default App;
