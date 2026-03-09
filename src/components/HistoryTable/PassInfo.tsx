import { useEffect, useMemo, useState } from 'react'
import { Pass, RobotConfigMetadata } from '../../lib/types'
import { getExecutionTimeMs } from '../../lib/passUtils'
import {
  downloadRobotConfig,
  getPassConfigComparison,
  getRobotConfigAtTime,
} from '../../lib/configUtils'
import { usePass } from '../../lib/contexts/PassContext'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { usePagination } from '../../lib/contexts/PaginationContext'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'

export interface PassInfoProps {
  configMetadata: Map<string, RobotConfigMetadata>
  loadingConfigMetadata: boolean
  setConfigMetadata: React.Dispatch<
    React.SetStateAction<Map<string, RobotConfigMetadata>>
  >
  fetchConfigMetadata: (pass: Pass, prevPass: Pass) => void
}

export const PassInfo: React.FC<PassInfoProps> = ({
  configMetadata,
  setConfigMetadata,
  loadingConfigMetadata,
  fetchConfigMetadata,
}: PassInfoProps) => {
  const { pass } = useSinglePass()
  const { groupedPasses } = usePagination()
  const {
    build_info: buildInfo,
    pass_mode: passMode,
    sanding_distance_mm: sandingDistanceMm,
  } = pass
  const { partId } = usePass()
  const { viamClient, machineId } = useViamClients()

  // Compute config comparison outside of render
  const { prevPass, configChanged } = useMemo(() => {
    const flatPasses = Object.values(groupedPasses).flat()
    return getPassConfigComparison(pass, flatPasses, configMetadata)
  }, [pass, groupedPasses, configMetadata])

  const [downloadingConfig, setDownloadingConfig] = useState<boolean>(false)

  const handleDownloadConfig = async (pass: Pass) => {
    if (!partId) {
      alert('Unable to download config: missing required information')
      return
    }

    const passId = pass.pass_id

    // Add to downloading state
    setDownloadingConfig(true)

    try {
      // Fetch the config that was active at the pass start time
      const result = await getRobotConfigAtTime(viamClient, partId, pass.start)

      if (!result) {
        alert('No configuration found for this time period')
        return
      }

      // Store metadata for display (if not already stored)
      if (!configMetadata.has(passId)) {
        setConfigMetadata((prev) => new Map(prev).set(passId, result.metadata))
      }

      // Download the config
      downloadRobotConfig(
        result.config,
        passId,
        result.metadata.configTimestamp,
        machineId
      )
    } catch (error) {
      console.error('Error downloading config:', error)
      alert('Failed to download configuration. Please try again.')
    } finally {
      // Remove from downloading state
      setDownloadingConfig(false)
    }
  }

  // Trigger fetch in useEffect instead of during render
  useEffect(() => {
    if (
      prevPass &&
      !configMetadata.has(prevPass.pass_id) &&
      !loadingConfigMetadata
    ) {
      fetchConfigMetadata(pass, prevPass)
    }
  }, [
    prevPass,
    configMetadata,
    loadingConfigMetadata,
    fetchConfigMetadata,
    pass,
  ])

  return (
    <div className="flex gap-8">
      <div className="info-section">
        <div className="flex items-center mb-3">
          <h4 className="m-0">Pass details</h4>
        </div>
        <div className="info-grid">
          {passMode !== undefined && (
            <div className="info-item">
              <span className="info-label">Mode</span>
              <span className="info-value">{passMode}</span>
            </div>
          )}

          {sandingDistanceMm !== undefined && (
            <div className="info-item">
              <span className="info-label">Sanding Distance</span>
              <span className="info-value">
                {sandingDistanceMm >= 1000
                  ? `${(sandingDistanceMm / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m`
                  : `${sandingDistanceMm.toFixed(1)} mm`}
              </span>
            </div>
          )}

          {sandingDistanceMm !== undefined && (() => {
            const execMs = getExecutionTimeMs(pass)
            if (execMs <= 0) return null
            const speedMs = (sandingDistanceMm / 1000) / (execMs / 1000)
            const speedKmh = speedMs * 3.6
            return (
              <div className="info-item">
                <span className="info-label">Sanding Speed</span>
                <span className="info-value relative group cursor-default">
                  {speedKmh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/h
                  <span className="absolute left-0 -bottom-7 hidden group-hover:block text-xs text-white bg-zinc-800 px-2 py-1 rounded whitespace-nowrap">
                    {speedMs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m/s
                  </span>
                </span>
              </div>
            )
          })()}
        </div>
      </div>
      <div className="info-section">
        <div className="flex items-center mb-3">
          <h4 className="m-0">Build information</h4>
        </div>

        {buildInfo?.version ||
        buildInfo?.git_revision ||
        buildInfo?.date_compiled ? (
          <div className="info-grid">
            {/* Version */}
            {buildInfo?.version && (
              <div className="info-item">
                <span className="info-label">Version</span>
                <span className="info-value">{buildInfo?.version}</span>
              </div>
            )}

            {/* Git Revision */}
            {buildInfo?.git_revision && (
              <div className="info-item">
                <span className="info-label">Git revision</span>
                <span className="info-value">{buildInfo?.git_revision}</span>
              </div>
            )}

            {/* Date Compiled */}
            {buildInfo?.date_compiled && (
              <div className="info-item">
                <span className="info-label">Date compiled</span>
                <span className="info-value">{buildInfo?.date_compiled}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="info-notice">
            Build information not available for this run.
          </div>
        )}
      </div>
      <div className="info-section">
        <div className="flex items-center mb-3">
          <h4 className="m-0">Config information</h4>
          {/* Only show the badge if the metadata for both passes has been loaded and they are different. */}
          {configChanged && (
            <div className="ml-3 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
              Config changed since last run
            </div>
          )}
        </div>

        {loadingConfigMetadata ? (
          <div className="flex items-center gap-2 mb-3 text-gray-500 text-sm">
            <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            Loading config info...
          </div>
        ) : configMetadata.has(pass.pass_id) ? (
          <div className="info-grid mb-3">
            {(() => {
              const metadata = configMetadata.get(pass.pass_id)!
              return (
                <>
                  <div className="info-item">
                    <span className="info-label">Timestamp</span>
                    <span className="info-value">
                      {metadata.configTimestamp.toLocaleString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <button
                      onClick={() => handleDownloadConfig(pass)}
                      disabled={downloadingConfig}
                      className={`px-3 py-1.5 text-xs text-white border-none rounded transition-colors duration-200 flex items-center gap-1.5 ${
                        downloadingConfig
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                      }`}
                    >
                      {downloadingConfig ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>Download config</>
                      )}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        ) : null}
      </div>
    </div>
  )
}
