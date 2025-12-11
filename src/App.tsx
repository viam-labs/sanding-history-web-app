import { Routes, Route } from 'react-router-dom';
import { ViamClientProvider } from './ViamClientContext';
import MainListPage from './MainListPage';
import VideoDetailPage from './VideoDetailPage';

function App() {
  return (
    <ViamClientProvider>
      <Routes>
        {/* Main list view - matches /machine/:machineInfo */}
        <Route path="/machine/:machineInfo" element={<MainListPage />} />

        {/* Video detail view - matches /machine/:machineInfo/videos/:video_id */}
        <Route path="/machine/:machineInfo/videos/:video_id" element={<VideoDetailPage />} />
      </Routes>
    </ViamClientProvider>
  );
}

export default App;
