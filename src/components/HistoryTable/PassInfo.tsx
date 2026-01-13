import { useEffect, useMemo, useState } from 'react'
import { Pass, RobotConfigMetadata } from '../../lib/types'
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
    blue_point_count: bluePointCount,
    blue_point_diff_percent: bluePointDiffPercent,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h4 style={{ margin: 0 }}>Blue points</h4>
        </div>
        <div className="info-grid">
          {bluePointCount !== undefined && (
            <div className="info-item">
              <span className="info-label">
                Blue Points
                {bluePointDiffPercent !== undefined && (
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: '#6b7280',
                      fontWeight: '500',
                    }}
                  >
                    ({bluePointDiffPercent > 0 ? '+' : ''}
                    {bluePointDiffPercent.toFixed(1)}
                    %)
                  </span>
                )}
              </span>
              <span className="info-value">
                {bluePointCount.toLocaleString()}
              </span>
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
        </div>
      </div>
      <div className="info-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h4 style={{ margin: 0 }}>Build information</h4>
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h4 style={{ margin: 0 }}>Config information</h4>
          {/* Only show the badge if the metadata for both passes has been loaded and they are different. */}
          {configChanged && (
            <div
              style={{
                marginLeft: '12px',
                fontSize: '12px',
                color: '#4f46e5',
                backgroundColor: '#eef2ff',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 500,
              }}
            >
              Config changed since last run
            </div>
          )}
        </div>

        {loadingConfigMetadata ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: '#6b7280',
              fontSize: '14px',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                borderTop: '2px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            Loading config info...
          </div>
        ) : configMetadata.has(pass.pass_id) ? (
          <div className="info-grid" style={{ marginBottom: '12px' }}>
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
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: downloadingConfig
                          ? '#9ca3af'
                          : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: downloadingConfig ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onMouseEnter={(e) => {
                        if (!downloadingConfig) {
                          e.currentTarget.style.backgroundColor = '#2563eb'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!downloadingConfig) {
                          e.currentTarget.style.backgroundColor = '#3b82f6'
                        }
                      }}
                    >
                      {downloadingConfig ? (
                        <>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              border: '2px solid #ffffff',
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
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
