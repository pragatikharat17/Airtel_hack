import React, { useEffect, useState } from 'react'
import { Stadium3D } from '../components/Stadium3D'
import { api } from '../lib/api'
import type { Site, CrowdSimulationResult } from '../types'
import { LabelBadge } from '../components/LabelBadge'
import { RiskBar } from '../components/RiskBadge'
import { AlertTriangle, Radio, Activity } from 'lucide-react'

type Filter = 'all' | '4g' | '5g' | 'congested' | 'backhaul'

const PHASES = [
  'Crowd building up',
  'Innings break',
  'Final over',
  'Post-match',
]

const PHASE_TIMES: Record<string, string> = {
  'Crowd building up': '17:00',
  'Innings break': '21:00',
  'Final over': '22:45',
  'Post-match': '23:15',
}

function getRiskTextColour(risk: string) {
  if (risk === 'CRITICAL') return 'text-red-400'
  if (risk === 'HIGH') return 'text-orange-400'
  if (risk === 'MODERATE') return 'text-yellow-400'
  return 'text-green-400'
}

export function DigitalTwinPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [selected, setSelected] = useState<Site | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [phase, setPhase] = useState('Innings break')
  const [err, setErr] = useState('')

  const [crowdSize, setCrowdSize] = useState(100000)
  const [crowdResult, setCrowdResult] =
    useState<CrowdSimulationResult | null>(null)
  const [crowdLoading, setCrowdLoading] = useState(false)
  const [crowdError, setCrowdError] = useState('')

  useEffect(() => {
    api.sites()
      .then(r => setSites(r.sites))
      .catch(() => setErr('Could not load site data.'))
  }, [])

  async function handleCrowdSimulation() {
    if (!Number.isFinite(crowdSize) || crowdSize <= 0) {
      setCrowdError('Please enter a valid crowd size.')
      return
    }

    setCrowdLoading(true)
    setCrowdError('')
    setCrowdResult(null)

    try {
      const result = await api.crowdSimulation(crowdSize, phase)
      setCrowdResult(result)
    } catch (error) {
      console.error(error)
      setCrowdError(
        'Crowd simulation failed. Please check whether the backend is running.'
      )
    } finally {
      setCrowdLoading(false)
    }
  }

  const filteredSites = sites.filter(site => {
    const phaseRow = site.phases.find(p => p.phase === phase)
    const load = phaseRow?.last_4g_anchor_load_pct ?? 0

    if (filter === '5g') return site.has_5g_bool
    if (filter === '4g') return !site.has_5g_bool
    if (filter === 'congested') return load >= 80
    if (filter === 'backhaul') return site.is_backhaul_constrained

    return true
  })

  if (err) {
    return <div className="p-6 text-red-400">{err}</div>
  }

  if (!sites.length) {
    return (
      <div className="p-6 text-gray-400 animate-pulse">
        Loading digital twin...
      </div>
    )
  }

  return (
    <div className="p-6 h-full overflow-y-auto space-y-5">

      {/* PAGE HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Digital Twin
          </h1>

          <p className="text-xs text-gray-400 mt-1">
            Interactive 3D stadium network visualisation · 8 network sites
            <span className="ml-2 text-amber-400 font-semibold">
              ⚠ Conceptual, not geographic
            </span>
            <span className="ml-2">
              <LabelBadge label="DATASET" />
            </span>
          </p>
        </div>

        <div
          className="px-4 py-3 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #172d50, #101b35)',
            border: '1px solid rgba(96,165,250,0.25)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
          }}
        >
          <p className="text-[9px] text-blue-300 uppercase tracking-widest">
            Selected phase
          </p>
          <p className="text-sm font-bold text-white">{phase}</p>
          <p className="text-[10px] text-gray-400">
            {PHASE_TIMES[phase]}
          </p>
        </div>
      </div>

      {/* CROWD SIMULATOR */}
      <div
        className="card space-y-4 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(24,39,70,0.98), rgba(13,22,43,0.98))',
          border: '1px solid rgba(100,160,255,0.2)',
          boxShadow:
            '0 12px 35px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-white">
              Crowd-to-Network Digital Twin
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Simulate how crowd size affects estimated network demand and
              site risk.
            </p>
          </div>

          <LabelBadge label="SIMULATION" />
        </div>

        {/* INPUTS */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Expected crowd size
            </label>

            <input
              type="number"
              min="1"
              value={crowdSize}
              onChange={e =>
                setCrowdSize(Math.max(1, Number(e.target.value)))
              }
              className="bg-airtel-charcoal-light border border-gray-600 rounded-lg px-3 py-2 text-sm text-white w-44 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="text-xs text-gray-400 pb-2">
            Selected phase:{' '}
            <span className="text-white">{phase}</span>
          </div>

          <button
            onClick={handleCrowdSimulation}
            disabled={crowdLoading}
            className="bg-airtel-red hover:bg-red-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-red-900/30"
          >
            {crowdLoading ? 'Simulating...' : 'Run Crowd Simulation'}
          </button>
        </div>

        {crowdError && (
          <p className="text-sm text-red-400">{crowdError}</p>
        )}

        {/* SIMULATION RESULTS */}
        {crowdResult && (
          <div className="space-y-4">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                [
                  'Total Crowd',
                  crowdResult.crowd_size.toLocaleString(),
                ],
                [
                  'Estimated Airtel Users',
                  crowdResult.airtel_users_estimated.toLocaleString(),
                ],
                [
                  'Active Data Users',
                  crowdResult.active_users_estimated.toLocaleString(),
                ],
                [
                  'Estimated Network Demand',
                  `${crowdResult.total_demand_gbps.toFixed(2)} Gbps`,
                ],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className="rounded-xl p-3 transition-all duration-200 hover:-translate-y-1"
                  style={{
                    background:
                      'linear-gradient(145deg, rgba(35,55,91,0.85), rgba(16,27,51,0.95))',
                    border: '1px solid rgba(120,160,220,0.16)',
                    boxShadow:
                      '0 7px 18px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  <p className="text-xs text-gray-400">{label}</p>
                  <p
                    className={`text-lg font-bold mt-2 ${
                      index === 3 ? 'text-red-400' : 'text-white'
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* SITE RISK TABLE */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Site-wise Network Risk
              </h3>

              <div className="overflow-x-auto rounded-lg border border-white/5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-airtel-charcoal-light bg-white/[0.03]">
                      {[
                        'Site',
                        'Radio Load',
                        'Additional Backhaul Utilization',
                        'Traffic (Gbps)',
                        'Backhaul Capacity',
                        'Overall Risk',
                      ].map(h => (
                        <th key={h} className="text-left p-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {crowdResult.sites.map(site => (
                      <tr
                        key={site.site}
                        className="border-b border-airtel-charcoal-light/50 hover:bg-white/[0.035] transition-colors"
                      >
                        <td className="p-3 font-bold text-white">
                          {site.site}
                        </td>

                        <td className="p-3 text-gray-300">
                          {site.baseline_radio_load_pct.toFixed(1)}%
                        </td>

                        <td className="p-3 text-gray-300">
                          {site.added_backhaul_utilization_pct.toFixed(1)}%
                        </td>

                        <td className="p-3 text-gray-300">
                          {site.traffic_gbps.toFixed(2)}
                        </td>

                        <td className="p-3 text-gray-300">
                          {site.backhaul_capacity_gbps} Gbps
                        </td>

                        <td className="p-3">
                          <span
                            className={`font-bold ${getRiskTextColour(
                              site.overall_risk
                            )}`}
                          >
                            {site.overall_risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ASSUMPTIONS */}
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-300 mb-2">
                Simulation assumptions
              </p>

              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-400">
                {crowdResult.assumptions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* PHASE AND FILTER CONTROLS */}
      <div
        className="flex flex-wrap gap-3 items-center justify-between rounded-xl p-3"
        style={{
          background: 'rgba(20,32,58,0.65)',
          border: '1px solid rgba(100,160,255,0.13)',
        }}
      >
        <div className="flex flex-wrap gap-1">
          {(
            ['all', '4g', '5g', 'congested', 'backhaul'] as Filter[]
          ).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                filter === f
                  ? 'bg-airtel-red text-white shadow-lg shadow-red-900/30'
                  : 'bg-airtel-charcoal-light text-gray-300 hover:bg-white/10'
              }`}
            >
              {f === 'backhaul'
                ? 'Backhaul-constrained'
                : f.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {PHASES.map(p => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                phase === p
                  ? 'bg-blue-700 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-airtel-charcoal-light text-gray-300 hover:bg-white/10'
              }`}
            >
              {PHASE_TIMES[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 3D STADIUM + SITE DETAILS */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] gap-4">

        {/* 3D STADIUM */}
        <div
          className="card min-w-0 overflow-hidden"
          style={{
            background:
              'linear-gradient(145deg, rgba(25,42,75,0.95), rgba(10,18,36,0.98))',
            border: '1px solid rgba(100,160,255,0.2)',
            boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-xs font-bold text-white tracking-widest">
                STADIUM NETWORK
              </p>
              <p className="text-[9px] text-sky-300">
                INTERACTIVE 3D VIEW · 8 NETWORK NODES
              </p>
            </div>

            <span className="text-[9px] text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              SIMULATION ACTIVE
            </span>
          </div>

          <Stadium3D
            sites={sites}
            phase={phase}
            selectedSite={selected?.site ?? null}
            filteredSites={filteredSites}
            onSelectSite={setSelected}
          />

          <div className="flex flex-wrap gap-3 text-[10px] text-gray-300 justify-center mt-3">
            {[
              ['#22c55e', '< 60% Low'],
              ['#eab308', '60–80% Moderate'],
              ['#f97316', '80–95% High'],
              ['#ef4444', '≥95% Critical'],
              ['#a78bfa', '5G Node'],
            ].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: color,
                    boxShadow: `0 0 7px ${color}`,
                  }}
                />
                {label}
              </span>
            ))}
          </div>

          <p className="text-center text-[9px] text-gray-500 mt-3">
            Conceptual topology · Not geographic · Phase: {phase}
            {' '}({PHASE_TIMES[phase]})
          </p>

          <p className="text-center text-[9px] text-gray-500 mt-1">
            Drag to rotate · Scroll to zoom · Select a node for site details
          </p>
        </div>

        {/* SITE DETAIL PANEL */}
        {selected ? (
          <div
            className="card min-w-0 space-y-3"
            style={{
              background:
                'linear-gradient(145deg, rgba(27,43,75,0.95), rgba(13,22,43,0.98))',
              border: '1px solid rgba(100,160,255,0.16)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  {selected.site}
                </h2>
                <p className="text-xs text-gray-400">
                  {selected.type}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                [
                  'Distance from centre',
                  selected.distance_m != null
                    ? `${selected.distance_m} m`
                    : 'no data',
                ],
                ['Backhaul', selected.backhaul_type ?? 'no data'],
                [
                  'Backhaul capacity',
                  selected.backhaul_capacity_gbps != null
                    ? `${selected.backhaul_capacity_gbps} Gbps`
                    : 'no data',
                ],
                [
                  'Has 5G (n78)',
                  selected.has_5g_bool ? 'Yes' : 'No',
                ],
              ].map(([key, value]) => (
                <div
                  key={key}
                  className="bg-airtel-charcoal/50 rounded-lg p-2 border border-white/5"
                >
                  <div className="text-gray-500">{key}</div>
                  <div className="font-semibold text-white mt-1">
                    {value}
                  </div>
                  <LabelBadge label="DATASET" />
                </div>
              ))}
            </div>

            {selected.is_backhaul_constrained && (
              <div className="text-xs text-amber-300 bg-amber-900/30 border border-amber-700 rounded-lg px-2 py-2 flex items-center gap-2">
                <AlertTriangle size={12} />
                Backhaul-constrained site — may saturate at peak load.
              </div>
            )}

            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Phase Data <LabelBadge label="DATASET" />
            </h3>

            <div className="space-y-3">
              {selected.phases.map((p, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-3 text-xs border transition-all ${
                    p.phase === phase
                      ? 'bg-airtel-red/10 border-airtel-red/30'
                      : 'bg-airtel-charcoal/40 border-white/5'
                  }`}
                >
                  <div className="font-semibold text-gray-200 mb-2">
                    {p.phase} ({p.time})
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 w-32">
                        4G anchor load
                      </span>
                      <RiskBar load={p.last_4g_anchor_load_pct} />
                    </div>

                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">
                        4G speed (last match)
                      </span>
                      <span className="font-mono">
                        {p.last_4g_speed_mbps != null
                          ? `${p.last_4g_speed_mbps} Mbps`
                          : 'no data'}
                      </span>
                    </div>

                    {selected.has_5g_bool ? (
                      <>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-400">
                            5G speed (last match)
                          </span>
                          <span className="font-mono">
                            {p.last_5g_speed_mbps != null
                              ? `${p.last_5g_speed_mbps} Mbps`
                              : 'no data'}
                          </span>
                        </div>

                        <div className="flex justify-between gap-2">
                          <span className="text-gray-400">
                            5G success (last match)
                          </span>
                          <span
                            className={`font-mono ${
                              (p.last_5g_success_pct ?? 100) < 90
                                ? 'text-red-400'
                                : 'text-green-400'
                            }`}
                          >
                            {p.last_5g_success_pct != null
                              ? `${p.last_5g_success_pct}%`
                              : 'no data'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500 italic">
                        No 5G cell at this site.
                        {p.last_5g_success_pct != null && (
                          <span className="ml-1 text-gray-400">
                            5G attach success: {p.last_5g_success_pct}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="card min-w-0 flex items-center justify-center text-gray-500 text-sm"
            style={{
              minHeight: 300,
              background:
                'linear-gradient(145deg, rgba(27,43,75,0.8), rgba(13,22,43,0.95))',
              border: '1px solid rgba(100,160,255,0.13)',
            }}
          >
            <div className="text-center">
              <Radio size={32} className="mx-auto mb-2 text-blue-400/50" />
              Click a 3D stadium node to see its site data.
            </div>
          </div>
        )}
      </div>

      {/* ALL SITES SUMMARY */}
      <div
        className="card"
        style={{
          background:
            'linear-gradient(145deg, rgba(25,39,68,0.9), rgba(13,22,43,0.96))',
          border: '1px solid rgba(100,160,255,0.13)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">
            All Sites — Summary <LabelBadge label="DATASET" />
          </h2>
          <Activity size={16} className="text-blue-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-airtel-charcoal-light">
                {[
                  'Site',
                  'Type',
                  'Dist (m)',
                  'Backhaul',
                  'BH Cap',
                  '5G',
                  'Phase: Anchor Load',
                  '4G Speed',
                  '5G Speed',
                  '5G Success',
                ].map(h => (
                  <th
                    key={h}
                    className="text-left pb-2 pr-3 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-airtel-charcoal-light">
              {sites.map(site => {
                const phaseRow = site.phases.find(
                  p => p.phase === phase
                )

                return (
                  <tr
                    key={site.site}
                    className={`hover:bg-white/5 cursor-pointer transition-colors ${
                      selected?.site === site.site
                        ? 'bg-airtel-red/10'
                        : ''
                    }`}
                    onClick={() => setSelected(site)}
                  >
                    <td className="py-2 pr-3 font-bold text-white">
                      {site.site}
                    </td>

                    <td className="py-2 pr-3 text-gray-400">
                      {site.type?.includes('Small')
                        ? 'Small cell'
                        : 'Macro'}
                    </td>

                    <td className="py-2 pr-3 font-mono">
                      {site.distance_m ?? 'no data'}
                    </td>

                    <td className="py-2 pr-3 text-gray-300">
                      {site.backhaul_type ?? 'no data'}
                    </td>

                    <td
                      className={`py-2 pr-3 font-mono ${
                        site.is_backhaul_constrained
                          ? 'text-amber-400'
                          : 'text-gray-300'
                      }`}
                    >
                      {site.backhaul_capacity_gbps != null
                        ? `${site.backhaul_capacity_gbps} Gbps`
                        : 'no data'}
                    </td>

                    <td className="py-2 pr-3">
                      {site.has_5g_bool ? (
                        <span className="text-airtel-red-light font-semibold">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>

                    <td className="py-2 pr-3 w-32">
                      <RiskBar
                        load={phaseRow?.last_4g_anchor_load_pct ?? null}
                      />
                    </td>

                    <td className="py-2 pr-3 font-mono">
                      {phaseRow?.last_4g_speed_mbps ?? 'no data'}
                    </td>

                    <td className="py-2 pr-3 font-mono">
                      {site.has_5g_bool
                        ? phaseRow?.last_5g_speed_mbps ?? 'no data'
                        : <span className="text-gray-600 italic">no 5G cell</span>}
                    </td>

                    <td
                      className={`py-2 font-mono ${
                        (phaseRow?.last_5g_success_pct ?? 100) < 90
                          ? 'text-red-400'
                          : 'text-green-400'
                      }`}
                    >
                      {phaseRow?.last_5g_success_pct != null
                        ? `${phaseRow.last_5g_success_pct}%`
                        : 'no data'}
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