import { useState } from 'react'
import * as VIAM from '@viamrobotics/sdk'
import './AppInterface.css'
import { CameraProvider } from './lib/contexts/CameraContext'
import { VideoStoreProvider } from './lib/contexts/VideoStoreContext'
import { ResourceSelection } from './components/ResouceSelection'
import HistoryTable from './components/HistoryTable'
import { Pagination } from './components/HistoryTable/Pagination'
import BeforeAfterModal from './components/BeforeAfterModal'
import GlobalLoadingIndicator from './components/GlobalLoadingIndicator'

function App() {
  const [beforeAfterModal, setBeforeAfterModal] = useState<{
    beforeImage: VIAM.dataApi.BinaryData | null
    afterImage: VIAM.dataApi.BinaryData | null
  } | null>(null)

  const closeBeforeAfterModal = () => {
    setBeforeAfterModal(null)
  }

  return (
    <div className="appInterface">
      <header className="flex items-center sticky top-0 z-10 mb-4 px-4 py-3 border-b bg-zinc-50 shadow-none md:shadow-xs">
        <div className="w-1/3 h-5 font-semibold text-zinc-900">
          Sanding history
        </div>
        <div className="w-1/3"></div>
      </header>

      <main className="mainContent">
        <section>
          <CameraProvider>
            <VideoStoreProvider>
              <ResourceSelection />
              <HistoryTable setBeforeAfterModal={setBeforeAfterModal} />
            </VideoStoreProvider>
          </CameraProvider>
        </section>
      </main>

      <Pagination />
      {/* Add the modal at the end */}
      {beforeAfterModal && (
        <BeforeAfterModal
          beforeImage={beforeAfterModal.beforeImage}
          afterImage={beforeAfterModal.afterImage}
          onClose={closeBeforeAfterModal}
        />
      )}

      <GlobalLoadingIndicator />
    </div>
  )
}

export default App
