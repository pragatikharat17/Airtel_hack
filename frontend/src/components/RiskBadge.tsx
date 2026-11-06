import React from 'react'

const RISK_BG: Record<string, string> = {
  Low:      'bg-risk-low/20 border-risk-low text-risk-low',
  Moderate: 'bg-risk-moderate/20 border-risk-moderate text-risk-moderate',
  High:     'bg-risk-high/20 border-risk-high text-risk-high',
  Critical: 'bg-risk-critical/20 border-risk-critical text-risk-critical',
  Unknown:  'bg-gray-800 border-gray-600 text-gray-400',
}

export function RiskBadge({ level }: { level: string }) {
  return (
    <span className={`text-xs font-bold border px-2 py-0.5 rounded ${RISK_BG[level] ?? RISK_BG.Unknown}`}>
      {level}
    </span>
  )
}

export function RiskBar({ load }: { load: number | null }) {
  if (load === null) return <span className="text-gray-500 text-xs italic">no data</span>
  const color = load >= 95 ? '#ef4444' : load >= 80 ? '#f97316' : load >= 60 ? '#eab308' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          style={{ width: `${Math.min(load, 100)}%`, backgroundColor: color }}
          className="h-full rounded-full transition-all"
        />
      </div>
      <span className="text-xs font-mono w-10 text-right" style={{ color }}>{load.toFixed(1)}%</span>
    </div>
  )
}
