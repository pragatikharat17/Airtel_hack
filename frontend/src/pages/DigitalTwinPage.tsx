import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Site } from '../types'
import { LabelBadge } from '../components/LabelBadge'
import { RiskBar, RiskBadge } from '../components/RiskBadge'
import { AlertTriangle, Wifi, Radio, Info } from 'lucide-react'

type Filter = 'all' | '4g' | '5g' | 'congested' | 'backhaul'

// Conceptual angles — evenly spaced, not geographic
const SITE_ANGLES: Record<string, number> = {
  M1: 0, M2: 60, M3: 120, M4: 180, M5: 240, M6: 300,
  S1: 30, S2: 210,
}

function polarToXY(angle: number, radius: number, cx: number, cy: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

function getRiskColour(load: number | null) {
  if (load === null) return '#6b7280'
  if (load >= 95) return '#ef4444'
  if (load >= 80) return '#f97316'
  if (load >= 60) return '#eab308'
  return '#22c55e'
}

export function DigitalTwinPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [selected, setSelected] = useState<Site | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [phase, setPhase] = useState('Innings break')
  const [err, setErr] = useState('')

  const PHASES = ['Crowd building up', 'Innings break', 'Final over', 'Post-match']
  const PHASE_TIMES: Record<string,string> = {
    'Crowd building up': '17:00', 'Innings break': '21:00',
    'Final over': '22:45', 'Post-match': '23:15',
  }

  useEffect(() => {
    api.sites().then(r => setSites(r.sites)).catch(() => setErr('Could not load site data.'))
  }, [])

  const filteredSites = sites.filter(s => {
    const phaseRow = s.phases.find(p => p.phase === phase)
    const load = phaseRow?.last_4g_anchor_load_pct ?? 0
    if (filter === '5g') return s.has_5g_bool
    if (filter === '4g') return !s.has_5g_bool
    if (filter === 'congested') return load >= 80
    if (filter === 'backhaul') return s.is_backhaul_constrained
    return true
  })

  const W = 400, H = 400, CX = 200, CY = 200
  const macroR = 130, smallR = 60

  if (err) return <div className="p-6 text-red-400">{err}</div>
  if (!sites.length) return <div className="p-6 text-gray-400 animate-pulse">Loading digital twin…</div>

  return (
    <div className="p-6 h-full overflow-y-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Digital Twin — Conceptual Stadium Layout</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Sites placed by distance from stadium centre (radius) with conceptual angles.
            <span className="ml-2 text-amber-400 font-semibold">⚠ Conceptual, not geographic.</span>
            <LabelBadge label="DATASET" />
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {(['all','4g','5g','congested','backhaul'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded transition-colors
                ${filter === f ? 'bg-airtel-red text-white' : 'bg-airtel-charcoal-light text-gray-300 hover:bg-white/10'}`}>
              {f === 'backhaul' ? 'Backhaul-constrained' : f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {PHASES.map(p => (
            <button key={p} onClick={() => setPhase(p)}
              className={`px-2 py-1 text-xs rounded transition-colors
                ${phase === p ? 'bg-blue-700 text-white' : 'bg-airtel-charcoal-light text-gray-300 hover:bg-white/10'}`}>
              {PHASE_TIMES[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {/* SVG twin */}
        <div className="card relative" style={{ width: 420, flexShrink: 0 }}>
          <svg width={W} height={H} className="mx-auto block">
            {/* Stadium bowl */}
            <circle cx={CX} cy={CY} r={45} fill="#16213e" stroke="#E40000" strokeWidth={2} strokeDasharray="4 2" />
            <text x={CX} y={CY+4} textAnchor="middle" fill="#E40000" fontSize={9} fontWeight="bold">STADIUM</text>

            {/* Macro ring */}
            <circle cx={CX} cy={CY} r={macroR} fill="none" stroke="#0f3460" strokeWidth={1} strokeDasharray="2 4" />
            {/* Small cell ring */}
            <circle cx={CX} cy={CY} r={smallR} fill="none" stroke="#1e3a5f" strokeWidth={1} strokeDasharray="2 4" />

            {/* Sites */}
            {sites.map(site => {
              const angle = SITE_ANGLES[site.site] ?? 0
              const r = site.type?.includes('Small') ? smallR : macroR
              const { x, y } = polarToXY(angle, r, CX, CY)
              const phaseRow = site.phases.find(p => p.phase === phase)
              const load = phaseRow?.last_4g_anchor_load_pct ?? null
              const color = getRiskColour(load)
              const isFiltered = !filteredSites.find(s => s.site === site.site)
              const isSelected = selected?.site === site.site
              return (
                <g key={site.site} style={{ cursor: 'pointer', opacity: isFiltered ? 0.2 : 1 }}
                  onClick={() => setSelected(site)}>
                  <circle cx={x} cy={y} r={isSelected ? 14 : 12}
                    fill={color} fillOpacity={0.25}
                    stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
                  {site.has_5g_bool && (
                    <circle cx={x} cy={y} r={5} fill="#E40000" fillOpacity={0.7} />
                  )}
                  <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">{site.site}</text>
                  {load !== null && (
                    <text x={x} y={y + 23} textAnchor="middle" fill={color} fontSize={7}>{load.toFixed(0)}%</text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[9px] text-gray-400 mt-2 justify-center">
            {[['#22c55e','< 60% (Low)'],['#eab308','60–80% (Mod)'],['#f97316','80–95% (High)'],['#ef4444','≥95% (Critical)']].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1">
                <span style={{ background: c }} className="w-2.5 h-2.5 rounded-full inline-block" />
                {l}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-airtel-red inline-block" /> 5G cell
            </span>
          </div>
          <p className="text-center text-[9px] text-gray-500 mt-1">
            Anchor load shown = last-match DATASET · Phase: {phase} ({PHASE_TIMES[phase]})
          </p>
        </div>

        {/* Site detail panel */}
        {selected ? (
          <div className="card flex-1 min-w-56 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-white">{selected.site}</h2>
                <p className="text-xs text-gray-400">{selected.type}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Distance from centre', selected.distance_m != null ? `${selected.distance_m} m` : 'no data', 'DATASET'],
                ['Backhaul', selected.backhaul_type ?? 'no data', 'DATASET'],
                ['Backhaul capacity', selected.backhaul_capacity_gbps != null ? `${selected.backhaul_capacity_gbps} Gbps` : 'no data', 'DATASET'],
                ['Has 5G (n78)', selected.has_5g_bool ? 'Yes' : 'No', 'DATASET'],
              ].map(([k, v, l]) => (
                <div key={String(k)} className="bg-airtel-charcoal/50 rounded p-2">
                  <div className="text-gray-500">{k}</div>
                  <div className="font-semibold text-white">{v}</div>
                  <LabelBadge label={String(l)} />
                </div>
              ))}
            </div>

            {selected.is_backhaul_constrained && (
              <div className="text-xs text-amber-300 bg-amber-900/30 border border-amber-700 rounded px-2 py-1 flex items-center gap-2">
                <AlertTriangle size={12} /> Backhaul-constrained site — may saturate at peak load
              </div>
            )}

            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Phase Data <LabelBadge label="DATASET" /></h3>
            <div className="space-y-3">
              {selected.phases.map((p, i) => (
                <div key={i} className={`rounded p-2 text-xs ${p.phase === phase ? 'bg-airtel-red/10 border border-airtel-red/30' : 'bg-airtel-charcoal/40'}`}>
                  <div className="font-semibold text-gray-200 mb-1">{p.phase} ({p.time})</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 w-32">4G anchor load (last match)</span>
                      <RiskBar load={p.last_4g_anchor_load_pct} />
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">4G speed (last match)</span>
                      <span className="font-mono">{p.last_4g_speed_mbps != null ? `${p.last_4g_speed_mbps} Mbps` : 'no data'}</span>
                    </div>
                    {selected.has_5g_bool ? (
                      <>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-400">5G speed (last match)</span>
                          <span className="font-mono">{p.last_5g_speed_mbps != null ? `${p.last_5g_speed_mbps} Mbps` : 'no data'}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-400">5G success (last match)</span>
                          <span className={`font-mono ${(p.last_5g_success_pct ?? 100) < 90 ? 'text-red-400' : 'text-green-400'}`}>
                            {p.last_5g_success_pct != null ? `${p.last_5g_success_pct}%` : 'no data'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500 italic">
                        No 5G cell at this site. 5G attach success = success for users on this 4G anchor.
                        {p.last_5g_success_pct != null && <span className="ml-1 text-gray-400">{p.last_5g_success_pct}%</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card flex-1 min-w-56 flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center">
              <Radio size={32} className="mx-auto mb-2 text-gray-700" />
              Click a site on the map to see its data
            </div>
          </div>
        )}
      </div>

      {/* Site table */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">All Sites — Summary <LabelBadge label="DATASET" /></h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-airtel-charcoal-light">
                {['Site','Type','Dist (m)','Backhaul','BH Cap','5G','Phase: Anchor Load','4G Speed (last match)','5G Speed (last match)','5G Success'].map(h => (
                  <th key={h} className="text-left pb-2 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-airtel-charcoal-light">
              {sites.map(s => {
                const pr = s.phases.find(p => p.phase === phase)
                return (
                  <tr key={s.site} className={`hover:bg-white/5 cursor-pointer ${selected?.site === s.site ? 'bg-airtel-red/10' : ''}`}
                    onClick={() => setSelected(s)}>
                    <td className="py-1.5 pr-3 font-bold text-white">{s.site}</td>
                    <td className="py-1.5 pr-3 text-gray-400">{s.type?.includes('Small') ? 'Small cell' : 'Macro'}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.distance_m ?? 'no data'}</td>
                    <td className="py-1.5 pr-3 text-gray-300">{s.backhaul_type ?? 'no data'}</td>
                    <td className={`py-1.5 pr-3 font-mono ${s.is_backhaul_constrained ? 'text-amber-400' : 'text-gray-300'}`}>
                      {s.backhaul_capacity_gbps != null ? `${s.backhaul_capacity_gbps} Gbps` : 'no data'}
                    </td>
                    <td className="py-1.5 pr-3">{s.has_5g_bool ? <span className="text-airtel-red-light font-semibold">Yes</span> : <span className="text-gray-500">No</span>}</td>
                    <td className="py-1.5 pr-3 w-32"><RiskBar load={pr?.last_4g_anchor_load_pct ?? null} /></td>
                    <td className="py-1.5 pr-3 font-mono">{pr?.last_4g_speed_mbps ?? 'no data'}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.has_5g_bool ? (pr?.last_5g_speed_mbps ?? 'no data') : <span className="text-gray-600 italic">no 5G cell</span>}</td>
                    <td className={`py-1.5 font-mono ${(pr?.last_5g_success_pct ?? 100) < 90 ? 'text-red-400' : 'text-green-400'}`}>
                      {pr?.last_5g_success_pct != null ? `${pr.last_5g_success_pct}%` : 'no data'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
