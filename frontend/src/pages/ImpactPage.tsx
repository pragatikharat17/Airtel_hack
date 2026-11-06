import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ImpactRow } from '../types'
import { LabelBadge } from '../components/LabelBadge'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, Cell
} from 'recharts'
import { Target, TrendingUp, TrendingDown } from 'lucide-react'

export function ImpactPage() {
  const [data, setData] = useState<{ rows: ImpactRow[] } | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.impact().then(setData).catch(() => setErr('Could not load impact data.'))
  }, [])

  if (err) return <div className="p-6 text-red-400">{err}</div>
  if (!data) return <div className="p-6 text-gray-400 animate-pulse">Loading impact…</div>

  const rows = data.rows

  const barData = rows.map(r => ({
    metric: r.metric.length > 25 ? r.metric.substring(0, 25) + '…' : r.metric,
    'Last match': r.last_match,
    Target: r.target,
    meets: r.meets_target,
  }))

  const tooltipStyle = { background: '#16213e', border: '1px solid #0f3460', borderRadius: 6 }

  return (
    <div className="p-6 h-full overflow-y-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Target size={18} className="text-airtel-red" />
          Impact: Last Match vs Target
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Comparing DATASET (last match) against TARGETs from the case brief.
          Gap shows work remaining for the final match.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {rows.map(r => {
          const good = r.meets_target
          return (
            <div key={r.metric}
              className={`card border ${good ? 'border-green-800' : 'border-red-800'}`}>
              <div className="text-[10px] text-gray-400 leading-tight mb-1">{r.metric}</div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-bold ${good ? 'text-green-400' : 'text-red-400'}`}>
                  {r.last_match != null ? r.last_match.toFixed(2) : 'no data'}
                </span>
                <span className="text-xs text-gray-400">{r.unit}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <LabelBadge label="DATASET" />
                <span className="text-lg">{good ? '✓' : '✗'}</span>
              </div>
              <div className="text-[9px] text-gray-500 mt-1">
                Target: {r.target}{r.unit} &nbsp;<LabelBadge label="TARGET" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail table */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">Detail — All KPIs vs Targets</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-airtel-charcoal-light">
              {['Metric','Last Match','Label','Target','Label','Gap','Direction','Meets Target?'].map(h => (
                <th key={h} className="text-left pb-2 pr-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-airtel-charcoal-light">
            {rows.map(r => (
              <tr key={r.metric} className="hover:bg-white/5">
                <td className="py-1.5 pr-3 text-gray-300 font-medium">{r.metric}</td>
                <td className={`py-1.5 pr-3 font-mono font-bold ${r.meets_target ? 'text-green-400' : 'text-red-400'}`}>
                  {r.last_match != null ? `${r.last_match.toFixed(2)} ${r.unit}` : 'no data'}
                </td>
                <td className="py-1.5 pr-3"><LabelBadge label={r.dataset_label} /></td>
                <td className="py-1.5 pr-3 font-mono text-white">
                  {r.target != null ? `${r.target} ${r.unit}` : 'no data'}
                </td>
                <td className="py-1.5 pr-3"><LabelBadge label={r.target_label} /></td>
                <td className={`py-1.5 pr-3 font-mono ${r.gap != null && r.gap < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {r.gap != null ? (r.gap >= 0 ? `+${r.gap}` : `${r.gap}`) : '—'} {r.unit}
                </td>
                <td className="py-1.5 pr-3 text-gray-500">
                  {r.direction === 'lower_is_better'
                    ? <span className="flex items-center gap-1"><TrendingDown size={11} /> Lower is better</span>
                    : <span className="flex items-center gap-1"><TrendingUp size={11} /> Higher is better</span>
                  }
                </td>
                <td className={`py-1.5 font-bold ${r.meets_target ? 'text-green-400' : 'text-red-400'}`}>
                  {r.meets_target === null ? '—' : r.meets_target ? '✓ Yes' : '✗ No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bar chart */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">Gap Visualisation</h2>
        <div className="space-y-4">
          {rows.map(r => {
            const good = r.meets_target
            const pct = r.target && r.last_match != null
              ? Math.min(Math.abs(r.last_match / r.target) * 100, 200)
              : 0
            const color = good ? '#22c55e' : '#ef4444'
            return (
              <div key={r.metric} className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-300">{r.metric}</span>
                  <span className="font-mono" style={{ color }}>
                    {r.last_match != null ? `${r.last_match.toFixed(2)} ${r.unit}` : 'no data'}
                    {' '}/ target {r.target}{r.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2 relative">
                    {/* Target marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                      style={{ left: r.direction === 'lower_is_better' ? `${Math.min((r.target! / (r.last_match! || 1)) * 100, 100)}%` : '100%' }}
                    />
                    <div
                      style={{ width: `${Math.min(pct, 100)}%`, background: color }}
                      className="h-full rounded-full"
                    />
                  </div>
                  <span style={{ color }} className="font-semibold">{good ? '✓' : '✗'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Findings note */}
      <div className="card text-xs space-y-2 text-gray-300">
        <div className="font-semibold text-white">Key Findings from Dataset <LabelBadge label="DATASET" /></div>
        <ul className="space-y-1 leading-relaxed">
          <li>• Where anchor load &lt; 80%, 5G success is about 99%. Where anchor load ≥ 95%, it averages about 37%.</li>
          <li>• Last-match 5G speed for connected users ranges about 4.3 to 59.4 Mbps across peak phases (varies widely by site and congestion).</li>
          <li>• M6 stays at ~47–60% anchor load at the last match — the best spare-capacity candidate for load offloading.</li>
          <li>• S1 and S2 reach ~80% anchor load at 17:00 (Crowd building up) — earliest warning signal in the dataset.</li>
          <li>• UPI failure last match: 1.84%, 7.11%, 6.82%, 5.23% vs ~1.1% normal day.</li>
        </ul>
      </div>
    </div>
  )
}
