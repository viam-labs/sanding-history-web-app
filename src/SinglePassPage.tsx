import './AppInterface.css'
import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { usePass } from './lib/contexts/PassContext'
import { useViamClients } from './lib/contexts/ViamClientContext'
import { CameraProvider } from './lib/contexts/CameraContext'
import { VideoStoreProvider } from './lib/contexts/VideoStoreContext'
import {
  SinglePassProvider,
  useSinglePass,
} from './lib/contexts/SinglePassContext'
import { PassInfo } from './components/HistoryTable/PassInfo'
import { StepsGrid } from './components/HistoryTable/StepsGrid'
import { Diagnosis } from './components/HistoryTable/Diagnosis'
import { PassFiles } from './components/HistoryTable/PassFiles'
import RenderIf from './components/RenderIf'
import { StatusBadge } from './components/StatusBadge'
import {
  getRobotConfigAtTime,
  getPassConfigComparison,
} from './lib/configUtils'
import { Pass, RobotConfigMetadata } from './lib/types'

function SinglePassPageContent() {
  const { pass, fetchStepFiles, fetchAllPassFiles } = useSinglePass()
  const { partId, passSummaries } = usePass()
  const { viamClient } = useViamClients()

  const [configMetadata, setConfigMetadata] = useState<
    Map<string, RobotConfigMetadata>
  >(new Map())
  const [loadingConfigMetadata, setLoadingConfigMetadata] = useState<
    Set<string>
  >(new Set())

  const fetchConfigMetadata = useCallback(
    async (currentPass: Pass, prevPass: Pass | null) => {
      if (!partId) return

      const passId = currentPass.pass_id
      const prevPassId = prevPass?.pass_id
      const idsToLoad = [passId]
      if (prevPassId && !configMetadata.has(prevPassId)) {
        idsToLoad.push(prevPassId)
      }

      setLoadingConfigMetadata((prev) => new Set([...prev, ...idsToLoad]))

      try {
        const promises = [
          getRobotConfigAtTime(viamClient, partId, currentPass.start),
        ]
        if (prevPass) {
          promises.push(
            getRobotConfigAtTime(viamClient, partId, prevPass.start)
          )
        }

        const results = await Promise.all(promises)

        const newMetadatas = new Map<string, RobotConfigMetadata>()
        if (results[0]) {
          newMetadatas.set(passId, results[0].metadata)
        }
        if (prevPassId && results[1]) {
          newMetadatas.set(prevPassId, results[1].metadata)
        }

        if (newMetadatas.size > 0) {
          setConfigMetadata((prev) => new Map([...prev, ...newMetadatas]))
        }
      } catch (error) {
        console.error('Error fetching config metadata:', error)
      } finally {
        setLoadingConfigMetadata((prev) => {
          const newSet = new Set(prev)
          idsToLoad.forEach((id) => newSet.delete(id))
          return newSet
        })
      }
    },
    [partId, viamClient]
  )

  useEffect(() => {
    fetchStepFiles()
    fetchAllPassFiles()

    if (partId) {
      const { prevPass } = getPassConfigComparison(pass, passSummaries, new Map())
      fetchConfigMetadata(pass, prevPass)
    }
    // Run once when the pass or partId changes
  }, [pass.pass_id, partId])

  return (
    <div className="pass-details">
      <RenderIf condition={pass.build_info !== undefined}>
        <PassInfo
          configMetadata={configMetadata}
          loadingConfigMetadata={loadingConfigMetadata.has(pass.pass_id)}
          setConfigMetadata={setConfigMetadata}
          fetchConfigMetadata={fetchConfigMetadata}
        />
      </RenderIf>

      <div className="passes-container">
        <StepsGrid />

        <Diagnosis />

        <div className="flex mx-3">
          <div className="flex-[2_1_0%] min-w-0">
            <PassFiles />
          </div>
        </div>
      </div>
    </div>
  )
}

function SinglePassPage() {
  const { passId } = useParams<{ passId: string }>()
  const { passSummaries } = usePass()

  const pass = passSummaries.find((p) => p.pass_id === passId)

  if (!pass) {
    return (
      <div className="p-5 w-full">
        <Link to="/" className="text-blue-500 hover:underline">
          ← Back to sanding history
        </Link>
        {passSummaries.length === 0 ? (
          <div className="mt-4 text-gray-600">Loading pass data...</div>
        ) : (
          <div className="mt-4 text-red-600">
            Pass not found: <code>{passId}</code>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="appInterface">
      <header className="flex items-center gap-4 sticky top-0 z-10 mb-4 px-4 py-3 border-b bg-zinc-50 md:shadow-xs flex-wrap">
        <Link
          to="/"
          className="text-blue-500 hover:underline text-sm shrink-0"
        >
          ← Back to sanding history
        </Link>
        <div className="font-semibold text-zinc-900 text-sm">
          Pass {pass.pass_id.substring(0, 8)}
        </div>
        <StatusBadge success={pass.success} />
        <div className="text-sm text-zinc-600">
          {pass.start.toLocaleString()} – {pass.end.toLocaleTimeString()}
        </div>
      </header>

      <main className="mainContent">
        <CameraProvider>
          <VideoStoreProvider>
            <SinglePassProvider pass={pass}>
              <SinglePassPageContent />
            </SinglePassProvider>
          </VideoStoreProvider>
        </CameraProvider>
      </main>
    </div>
  )
}

export default SinglePassPage
