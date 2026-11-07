import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import { TrendingUp, Wifi, Radio, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import type { OverviewData } from '../types'
import { LabelBadge, ValueWithLabel } from '../components/LabelBadge'
import { Disclaimer } from '../components/Disclaimer'

const PHASE_TIMES = ['17:00', '21:00', '22:45', '23:15']

function KPICard({ name, value, unit, label }: { name: string; value: string | number; unit: string; label: string }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-400 mb-1">{name}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      <div className="mt-1"><LabelBadge label={label} /></div>
    </div>
  )
}

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.overview().then(setData).catch(() => setErr('Could not load overview data. Is the backend running?'))
  }, [])

  if (err) return <div className="p-6 text-red-400">{err}</div>
  if (!data) return <div className="p-6 text-gray-400 animate-pulse">Loading overview…</div>

  const cap = data.capacity

  // Demand vs capacity bar chart data
  const demandData = [
    { name: '5G Demand', value: cap.demand_5g_gbps, fill: '#E40000', label: 'MODEL' },
    { name: '4G Demand', value: cap.demand_4g_gbps, fill: '#f97316', label: 'MODEL' },
  ]

  const cellData = [
  { name: '5G cells needed', value: cap.cells_needed_5g, label: 'MODEL' },
  { name: '4G cells needed', value: cap.cells_needed_4g, label: 'MODEL' },
]
  

  const budgetPie = [
    { name: 'Committed', value: data.budget_summary.committed_lakh, fill: '#E40000' },
    { name: 'Reserve', value: data.budget_summary.reserve_lakh, fill: '#374151' },
  ]

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Airtel SYNC PULSE — Command Centre Overview</h1>
          <p className="text-xs text-gray-400 mt-1">Stadium Surge · 1,00,000-fan IPL Final · Budget Rs 4 crore · 60 days</p>
        </div>
        <Disclaimer />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard name="Airtel users" value={cap.airtel_users.toLocaleString()} unit="" label="MODEL" />
        <KPICard name="Total demand" value={cap.total_demand_gbps.toFixed(2)} unit="Gbps" label="MODEL" />
        <KPICard name="5G cells needed" value={cap.cells_needed_5g} unit="" label="MODEL" />
        <KPICard name="4G cells needed" value={cap.cells_needed_4g} unit="" label="MODEL" />
        <KPICard name="Extra 5G cells" value={cap.extra_5g_cells} unit="to add" label="MODEL" />
        <KPICard name="Extra 4G cells" value={cap.extra_4g_cells} unit="to add" label="MODEL" />
        <KPICard name="Budget committed" value={`Rs ${data.budget_summary.committed_lakh}`} unit="L" label="ASSUMPTION" />
        <KPICard name="Budget reserve" value={`Rs ${data.budget_summary.reserve_lakh}`} unit="L" label="ASSUMPTION" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Demand chart */}
        <div className="card md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={14} className="text-airtel-red" />
              Traffic Demand vs Cell Counts
            </h2>
            <LabelBadge label="MODEL" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cellData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 6 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {cellData.map((entry, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#E40000' : '#374151'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget pie */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Budget Split</h2>
            <LabelBadge label="ASSUMPTION" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={budgetPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}L`}>
                {budgetPie.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity formula table */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Radio size={14} className="text-airtel-red" />
          Capacity Model — Key Numbers
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-airtel-charcoal-light">
                <th className="text-left pb-2 font-medium">Parameter</th>
                <th className="text-right pb-2 font-medium">Value</th>
                <th className="text-right pb-2 font-medium">Label</th>
                <th className="text-left pb-2 font-medium pl-4">Formula / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-airtel-charcoal-light">
              {[
                ['Total fans',           '1,00,000',                 'DATASET',    'Case brief'],
                ['Airtel share',         '40%',                      'ASSUMPTION', '—'],
                ['Airtel users',         cap.airtel_users.toLocaleString(), 'MODEL', 'fans × 40%'],
                ['5G phone share',       '70%',                      'ASSUMPTION', '—'],
                ['Concurrent online',    '18%',                      'ASSUMPTION', '—'],
                ['5G users online',      cap.online_5g_users.toLocaleString(), 'MODEL', 'Airtel × 18% × 70%'],
                ['4G users online',      cap.online_4g_users.toLocaleString(), 'MODEL', 'Airtel × 18% × 30%'],
                ['Target 5G speed',      '5 Mbps',                   'TARGET',     '—'],
                ['Target 4G speed',      '3 Mbps',                   'TARGET',     '—'],
                ['5G demand',            `${cap.demand_5g_gbps} Gbps`, 'MODEL',    '5G users × 5 Mbps'],
                ['4G demand',            `${cap.demand_4g_gbps} Gbps`, 'MODEL',    '4G users × 3 Mbps'],
                ['Total demand',         `${cap.total_demand_gbps} Gbps`, 'MODEL', '5G + 4G'],
                ['5G cell capacity',     `${cap.gross_capacity_5g_gbps} Gbps gross`, 'MODEL', '100 MHz × 12 bps/Hz × 0.74 DL share'],
                ['5G usable at 80%',     `${cap.usable_capacity_5g_gbps} Gbps`, 'MODEL', 'gross × 80%'],
                ['4G cell capacity',     `${cap.gross_capacity_4g_gbps} Gbps gross`, 'MODEL', '70 MHz × 3.5 bps/Hz'],
                ['4G usable at 80%',     '0.2 Gbps',                 'MODEL',      'gross × 80%, rounded per deck'],
                ['5G cells needed',      cap.cells_needed_5g,         'MODEL',     '⌈25.2 / 0.7104⌉'],
                ['4G cells needed',      cap.cells_needed_4g,         'MODEL',     '⌈6.48 / 0.2⌉'],
                ['Extra 5G (36−12)',     cap.extra_5g_cells,          'MODEL',     '—'],
                ['Extra 4G (33−20)',     cap.extra_4g_cells,          'MODEL',     '—'],
              ].map(([param, val, lbl, note]) => (
                <tr key={String(param)} className="hover:bg-white/5">
                  <td className="py-1 text-gray-300">{param}</td>
                  <td className="py-1 text-right font-mono text-white">{val}</td>
                  <td className="py-1 text-right"><LabelBadge label={String(lbl)} /></td>
                  <td className="py-1 pl-4 text-gray-500">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backhaul warnings */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-400" />
          Backhaul Constraints <LabelBadge label="DATASET" />
        </h2>
        <ul className="space-y-1">
          {cap.backhaul_warnings.map((w, i) => (
            <li key={i} className="text-xs text-amber-300 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">⚠</span> {w}
            </li>
          ))}
        </ul>
      </div>

      {/* Reconciliation */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">Data Reconciliation Report <LabelBadge label="DATASET" /></h2>
        <div className="grid grid-cols-3 gap-4 text-xs text-gray-300 mb-3">
          <div>Table 1 (site×phase) rows: <span className="font-bold text-white">{data.reconciliation.table1_data_rows}</span></div>
          <div>Table 2 (site meta) rows: <span className="font-bold text-white">{data.reconciliation.table2_data_rows}</span></div>
          <div>Table 3 (UPI) rows: <span className="font-bold text-white">{data.reconciliation.table3_data_rows}</span></div>
        </div>
        <div className="text-xs text-gray-400 mb-2">
          Unused columns R:T ({data.reconciliation.unused_columns_R_T.length} cells with data — ignored per spec):
          <span className="ml-2 font-mono text-gray-500">
            {data.reconciliation.unused_columns_R_T.slice(0,6).map(c => `${c.cell}=${c.value}`).join(', ')}
            {data.reconciliation.unused_columns_R_T.length > 6 ? '…' : ''}
          </span>
        </div>
        <ul className="space-y-0.5">
          {data.reconciliation.notes.map((n, i) => (
            <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
              <span>•</span><span>{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
