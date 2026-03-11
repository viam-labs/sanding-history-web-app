import React from 'react'

export interface SandingSpeedProps {
  execMs: number
  sandingDistanceMm: number | undefined
}

export const SandingSpeed: React.FC<SandingSpeedProps> = ({
  execMs,
  sandingDistanceMm,
}) => {
  if (sandingDistanceMm === undefined || execMs <= 0) return null
  const speedMps = (sandingDistanceMm / 1000) / (execMs / 1000)
  const speedKmh = (speedMps / 1000) * (60 * 60)
  const fmt = (v: number) =>
    v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  return (
    <div className="info-item">
      <span className="info-label">Sanding Speed</span>
      <span className="info-value relative group cursor-default">
        {fmt(speedKmh)} km/h
        <span className="absolute left-0 -bottom-7 hidden group-hover:block text-xs text-white bg-zinc-800 px-2 py-1 rounded whitespace-nowrap">
          {fmt(speedMps)} m/s
        </span>
      </span>
    </div>
  )
}
