import { createContext, useContext, useState, ReactNode } from 'react'
import { SnapshotProto } from '@viamrobotics/motion-tools/lib'
import SnapshotModal from '../../components/SnapshotModal'
import * as VIAM from '@viamrobotics/sdk'
import BeforeAfterModal from '../../components/BeforeAfterModal'

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
  beforeImage: VIAM.dataApi.BinaryData | null
  afterImage: VIAM.dataApi.BinaryData | null
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

    if (modalData.type === ModalType.SNAPSHOT) {
      return <SnapshotModal close={closeModal} snapshot={modalData.snapshot} />
    } else if (modalData.type === ModalType.BEFORE_AFTER) {
      return (
        <BeforeAfterModal
          onClose={closeModal}
          beforeImage={modalData.beforeImage}
          afterImage={modalData.afterImage}
        />
      )
    }

    return null
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
