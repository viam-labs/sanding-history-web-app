import { HashRouter, Routes, Route } from 'react-router-dom'

import App from './App'
import { ViamClientProvider } from './lib/contexts/ViamClientContext'
import VideoDetailPage from './VideoDetailPage'
import { ModalProvider } from './lib/contexts/ModalContext'
import { FilesProvider } from './lib/contexts/FilesContext'
import { PassProvider } from './lib/contexts/PassContext'
import { PaginationProvider } from './lib/contexts/PaginationContext'
import { ToastProvider } from './lib/contexts/ToastContext'

function Root() {
  return (
    <ToastProvider>
      <ViamClientProvider>
        <PassProvider>
          <FilesProvider>
            <PaginationProvider>
              <ModalProvider>
                <HashRouter>
                  <Routes>
                    {/* Main list view - served at /machine/:machineInfo#/ */}
                    <Route path="/" element={<App />} />

                    {/* Video detail view - served at /machine/:machineInfo#/videos/:videoId */}
                    <Route
                      path="/videos/:videoId"
                      element={<VideoDetailPage />}
                    />
                  </Routes>
                </HashRouter>
              </ModalProvider>
            </PaginationProvider>
          </FilesProvider>
        </PassProvider>
      </ViamClientProvider>
    </ToastProvider>
  )
}

export default Root
