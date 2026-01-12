import React, { useState } from 'react'
import * as VIAM from '@viamrobotics/sdk'

import './AppInterface.css'
import GlobalLoadingIndicator from './components/GlobalLoadingIndicator'
import { PassNote, PassDiagnosis } from './lib/types'
import { ResourceSelection } from './components/ResouceSelection'
import BeforeAfterModal from './components/BeforeAfterModal'
import { Pagination } from './components/HistoryTable/Pagination'
import HistoryTable from './components/HistoryTable'
import { CameraProvider } from './lib/contexts/CameraContext'
import { VideoStoreProvider } from './lib/contexts/VideoStoreContext'

interface AppViewProps {
  passSummaries?: any[]
  files: Map<string, VIAM.dataApi.BinaryData>
  videoFiles: Map<string, VIAM.dataApi.BinaryData>
  imageFiles: Map<string, VIAM.dataApi.BinaryData>
  fetchVideos: (start: Date) => Promise<void>
  fetchTimestamp: Date | null
  partId: string
  passNotes: Map<string, PassNote[]>
  onNotesUpdate: React.Dispatch<React.SetStateAction<Map<string, PassNote[]>>>
  passDiagnoses: Map<string, PassDiagnosis>
  onDiagnosesUpdate: React.Dispatch<
    React.SetStateAction<Map<string, PassDiagnosis>>
  >
  fetchingNotes: boolean
}

const AppInterface: React.FC<AppViewProps> = ({
  passSummaries = [],
  files,
  videoFiles,
  imageFiles,
  fetchVideos,
  fetchTimestamp,
  partId,
  passNotes,
  onNotesUpdate,
  passDiagnoses,
  onDiagnosesUpdate,
  fetchingNotes,
}) => {
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

              <HistoryTable
                setBeforeAfterModal={setBeforeAfterModal}
                partId={partId}
                passSummaries={passSummaries}
                fetchingNotes={fetchingNotes}
                passNotes={passNotes}
                passDiagnoses={passDiagnoses}
                onNotesUpdate={onNotesUpdate}
                onDiagnosesUpdate={onDiagnosesUpdate}
                imageFiles={imageFiles}
                videoFiles={videoFiles}
                fetchTimestamp={fetchTimestamp}
                fetchVideos={fetchVideos}
                files={files}
              />
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

export default AppInterface
