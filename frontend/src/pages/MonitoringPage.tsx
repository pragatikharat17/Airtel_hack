import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { api } from '../lib/api'
import { LabelBadge } from '../components/LabelBadge'

type Mode = 'normal' | 'last_match'

const PHASES = ['Crowd building up', 'Innings break', 'Final over', 'Post-match']
const TIMES  = ['17:00','21:00','22:45','23:15']

const SITE_COLORS: Record<string, string> = {
  M1:'#E40000', M2:'#f97316', M3:'#eab308', M4:'#22c55e',
  M5:'#3b82f6', M6:'#a855f7', S1:'#ec4899', S2:'#14b8a6',
}

export function MonitoringPage() {
  const [data, setData] = useState<{ site_phase_data: any[]; upi_data: any[]; model_fit: any } | null>(null)
  const [mode, setMode] = useState<Mode>('last_match')
  const [err, setErr] = useState('')

  useEffect(() => {
    api.networkMetrics().then(setData).catch(() => setErr('Could not load monitoring data.'))
  }, [])

  if (err) return <div className="p-6 text-red-400">{err}</div>
  if (!data) return <div className="p-6 text-gray-400 animate-pulse">Loading monitoring…</div>

  // Build chart data: one row per phase, one key per site
  const sites = [...new Set(data.site_phase_data.map((r: any) => r.site))]

  function buildChartData(metric: string) {
    return PHASES.map((phase, i) => {
      const row: Record<string, any> = { phase: TIMES[i] }
      sites.forEach(site => {
        const r = data!.site_phase_data.find((d: any) => d.site === site && d.phase === phase)
        const key = mode === 'last_match' ? `last_${metric}` : `normal_${metric}`
        row[site] = r?.[key] ?? null
      })
      return row
    })
  }

  const loadData    = buildChartData('4g_anchor_load_pct')
  const speed4gData = buildChartData('4g_speed_mbps')
  const speed5gData = buildChartData('5g_speed_mbps')

  // 5G success data (only last_match in dataset)
  const success5gData = PHASES.map((phase, i) => {
    const row: Record<string, any> = { phase: TIMES[i] }
    sites.forEach(site => {
      const r = data!.site_phase_data.find((d: any) => d.site === site && d.phase === phase)
      row[site] = r?.last_5g_success_pct ?? null
    })
    return row
  })

  // UPI data
  const upiData = data.upi_data.map((u: any) => ({
    phase: u.phase,
    'Last match': u.last_match_upi_failure_pct,
    'Normal day': u.normal_day_upi_failure_pct,
  }))

  const tooltipStyle = { background: '#16213e', border: '1px solid #0f3460', borderRadius: 6 }

  function ChartSection({ title, chartData, unit, label, refLine, refLabel }:
    { title: string; chartData: any[]; unit: string; label: string; refLine?: number; refLabel?: string }) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <LabelBadge label={label} />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis dataKey="phase" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} unit={unit} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff' }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            {refLine !== undefined && (
              <ReferenceLine y={refLine} stroke="#fff" strokeDasharray="4 2"
                label={{ value: refLabel, fill: '#9ca3af', fontSize: 9, position: 'right' }} />
            )}
            {sites.map(site => (
              <Line key={site} type="monotone" dataKey={site}
                stroke={SITE_COLORS[site] ?? '#888'}
                strokeWidth={1.5} dot={{ r: 3 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const mf = data.model_fit

  return (
    <div className="p-6 h-full overflow-y-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Network Monitoring</h1>
          <p className="text-xs text-gray-400 mt-0.5">4 match phases × 8 sites — from Sync_V1.xlsx</p>
        </div>
        <div className="flex gap-2">
          {(['normal', 'last_match'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs rounded transition-colors
                ${mode === m ? 'bg-airtel-red text-white' : 'bg-airtel-charcoal-light text-gray-300 hover:bg-white/10'}`}>
              {m === 'normal' ? 'Normal Day' : 'Last Match'}
            </button>
          ))}
        </div>
      </div>

      <ChartSection
        title="4G Anchor (B3) Load %"
        chartData={loadData}
        unit="%"
        label="DATASET"
        refLine={80}
        refLabel="80% threshold"
      />

      <ChartSection
        title="4G User Speed (Mbps)"
        chartData={speed4gData}
        unit=" Mbps"
        label="DATASET"
        refLine={3}
        refLabel="3 Mbps target"
      />

      <ChartSection
        title="5G User Speed (Mbps) — sites with 5G only"
        chartData={speed5gData}
        unit=" Mbps"
        label="DATASET"
        refLine={5}
        refLabel="5 Mbps target"
      />

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">5G Connection Success % (Last Match only)</h2>
          <LabelBadge label="DATASET" />
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Where anchor load ≥ 95%, success averages ~37%. Where anchor &lt; 80%, success is ~99%.
          Sites without 5G cells show "5G attach success for users served by this anchor".
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={success5gData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis dataKey="phase" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} unit="%" domain={[0, 105]} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff' }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <ReferenceLine y={95} stroke="#22c55e" strokeDasharray="4 2"
              label={{ value: '95% target', fill: '#9ca3af', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={90} stroke="#f97316" strokeDasharray="4 2"
              label={{ value: '90% alert', fill: '#9ca3af', fontSize: 9, position: 'right' }} />
            {sites.map(site => (
              <Line key={site} type="monotone" dataKey={site}
                stroke={SITE_COLORS[site] ?? '#888'}
                strokeWidth={1.5} dot={{ r: 3 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* UPI chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">UPI Payment Failure Rate % — Stadium-wide</h2>
          <LabelBadge label="DATASET" />
        </div>
        <p className="text-xs text-gray-500 mb-2">
          UPI is stadium-wide, not per site. Network QoS cannot guarantee end-to-end UPI success.
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={upiData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis dataKey="phase" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff' }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <ReferenceLine y={1.5} stroke="#22c55e" strokeDasharray="4 2"
              label={{ value: '1.5% target', fill: '#9ca3af', fontSize: 9, position: 'right' }} />
            <Line type="monotone" dataKey="Last match" stroke="#E40000" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Normal day" stroke="#6b7280" strokeWidth={1.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Model fit panel */}
      {mf && !mf.error && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white">5G Success ~ Anchor Load: Simple Linear Fit</h2>
            <LabelBadge label="MODEL" />
          </div>
          <div className="text-xs space-y-1 text-gray-300">
            <p>Formula: <code className="text-amber-300">{mf.formula}</code></p>
            <p>Intercept: <span className="font-mono text-white">{mf.intercept}</span> &nbsp;|&nbsp; Slope: <span className="font-mono text-white">{mf.slope}</span></p>
            <p className="text-amber-300">Leave-one-site-out CV MAE: {mf.cv_mae_pct} percentage points</p>
            <p className="text-gray-500 italic">{mf.cv_note}</p>
            <p className="text-orange-400">{mf.warning}</p>
          </div>
          <table className="w-full text-xs mt-3">
            <thead>
              <tr className="text-gray-400 border-b border-airtel-charcoal-light">
                <th className="text-left pb-1">Site</th>
                <th className="text-right pb-1">Mean Anchor Load</th>
                <th className="text-right pb-1">Mean 5G Success</th>
                <th className="text-right pb-1">Predicted Success</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-airtel-charcoal-light">
              {Object.entries(mf.site_predictions ?? {}).map(([site, pred]: any) => (
                <tr key={site} className="hover:bg-white/5">
                  <td className="py-1 font-bold text-white">{site}</td>
                  <td className="py-1 text-right font-mono">{pred.mean_load}%</td>
                  <td className="py-1 text-right font-mono">{pred.mean_success}%</td>
                  <td className="py-1 text-right font-mono text-amber-300">{pred.predicted_success}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
