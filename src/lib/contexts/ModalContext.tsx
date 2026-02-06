import { createContext, useContext, useState, ReactNode, Suspense } from 'react'
import { SnapshotProto } from '@viamrobotics/motion-tools/lib'
import { lazy } from 'react'
import LoadingModal from '../../components/LoadingModal.tsx'
import { BinaryDataFile } from '../BinaryDataFile.ts'
const SnapshotModal = lazy(() => import('../../components/SnapshotModal.tsx'))
const BeforeAfterModal = lazy(
  () => import('../../components/BeforeAfterModal.tsx')
)
// Define modal types
export enum ModalType {
  SNAPSHOT = 'snapshot',
  BEFORE_AFTER = 'before_after',
}

// Define props for each modal type
interface SnapshotModalData {
  type: ModalType.SNAPSHOT
  snapshot: SnapshotProto
}

interface BeforeAfterModalData {
  type: ModalType.BEFORE_AFTER
  beforeImage: BinaryDataFile | null
  afterImage: BinaryDataFile | null
}

// Discriminated union of all modal configs
export type ModalData = SnapshotModalData | BeforeAfterModalData
interface ModalContextType {
  openModal: (data: ModalData) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalData, setModalData] = useState<ModalData | null>(null)

  const openModal = (data: ModalData) => setModalData(data)
  const closeModal = () => setModalData(null)

  const renderModal = () => {
    if (!modalData) return null

    return (
      <Suspense fallback={<LoadingModal loadingText="Loading modal..." />}>
        {modalData.type === ModalType.SNAPSHOT && (
          <SnapshotModal close={closeModal} snapshot={modalData.snapshot} />
        )}
        {modalData.type === ModalType.BEFORE_AFTER && (
          <BeforeAfterModal
            onClose={closeModal}
            beforeImage={modalData.beforeImage}
            afterImage={modalData.afterImage}
          />
        )}
      </Suspense>
    )
  }

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {renderModal()}
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
