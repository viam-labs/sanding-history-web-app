import { ModalType, useModal } from '../../lib/contexts/ModalContext'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import {
  DENSITY_SNAPSHOT_FILE_NAME_PREFIX,
  SNAPSHOT_FILE_NAME_PREFIX,
} from '../../lib/constants'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { useToast } from '../../lib/contexts/ToastContext.tsx'
import { getSnapshotFromGzipBinaryData } from '../../lib/snapshotUtils'
import { useState } from 'react'
import RenderIf from '../RenderIf.tsx'
import { LoadingIndicator } from '../LoadingIndicator.tsx'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'
import Spinner from '../Spinner.tsx'
import { SnapshotLinkList } from './SnapshotLinkList.tsx'

export const StepsVizSnapshotCard = () => {
  const { openModal } = useModal()
  const { viamClient } = useViamClients()
  const { trajectorySnapshots, densitySnapshots, isFetchingSnapshots } =
    useSinglePass()
  const { addMessage } = useToast()
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  const handleViewSnapshotClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    snapshotFile: BinaryDataFile
  ) => {
    e.preventDefault()
    setLoadingSnapshot(true)
    const fileBinaryData = await snapshotFile.getFileBinaryData(viamClient)
    if (!fileBinaryData) {
      console.error('Failed to get file binary data')
      addMessage({
        message: 'Failed to get file binary data',
        type: 'error',
      })
      return
    }
    const snapshot = await getSnapshotFromGzipBinaryData(fileBinaryData)
    setLoadingSnapshot(false)
    openModal({
      type: ModalType.SNAPSHOT,
      snapshot: snapshot,
    })
  }

  return (
    <div className="step-card">
      <div className="step-name">View Snapshot</div>
      <p>Load and display a 3D scene from a snapshot file.</p>
      <RenderIf condition={isFetchingSnapshots}>
        <div className="flex flex-col items-center justify-center py-2">
          <Spinner size="24px" />
          <p className="text-gray-500 text-sm">Loading snapshots...</p>
        </div>
      </RenderIf>
      <RenderIf condition={loadingSnapshot}>
        <LoadingIndicator loadingText="Loading snapshot..." />
      </RenderIf>
      <RenderIf condition={!loadingSnapshot}>
        <RenderIf condition={trajectorySnapshots.length > 0}>
          <p className="text-sm font-medium text-gray-700 mt-1">Trajectories</p>
          <SnapshotLinkList
            files={trajectorySnapshots}
            prefix={SNAPSHOT_FILE_NAME_PREFIX}
            onSnapshotClick={handleViewSnapshotClick}
          />
        </RenderIf>
        <RenderIf condition={densitySnapshots.length > 0}>
          <p className="text-sm font-medium text-gray-700 mt-1">
            Density Heatmaps
          </p>
          <SnapshotLinkList
            files={densitySnapshots}
            prefix={DENSITY_SNAPSHOT_FILE_NAME_PREFIX}
            onSnapshotClick={handleViewSnapshotClick}
          />
        </RenderIf>
      </RenderIf>
    </div>
  )
}
