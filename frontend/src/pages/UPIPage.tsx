import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { LabelBadge } from '../components/LabelBadge'
import { Alert } from '../components/Alert'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { Shield, AlertTriangle } from 'lucide-react'

export function UPIPage() {
  const [data, setData] = useState<{ site_phase_data: any[]; upi_data: any[] } | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.networkMetrics().then(setData).catch(() => setErr('Could not load UPI data.'))
  }, [])

  if (err) return <div className="p-6 text-red-400">{err}</div>
  if (!data) return <div className="p-6 text-gray-400 animate-pulse">Loading…</div>

  const upiData = data.upi_data.map((u: any) => ({
    phase: u.phase,
    'Last match': u.last_match_upi_failure_pct,
    'Normal day': u.normal_day_upi_failure_pct,
  }))

  const tooltipStyle = { background: '#16213e', border: '1px solid #0f3460', borderRadius: 6 }

  return (
    <div className="p-6 h-full overflow-y-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield size={18} className="text-airtel-red" />
          UPI Payment &amp; Emergency Call Protection
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Stadium-wide UPI failure rates and emergency network protection</p>
      </div>

      {/* Critical disclaimer */}
      <Alert severity="warning">
        <strong>Important:</strong> Network-level QoS priority (QCI/GBR bearer) reduces RAN-side packet loss
        and latency for UPI/POS traffic on stall-facing cells. It CANNOT guarantee end-to-end UPI
        transaction success — the payment gateway, internet path, and bank availability are outside
        Airtel RAN control.
      </Alert>

      {/* UPI chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">UPI Failure Rate — Last Match vs Normal Day</h2>
          <LabelBadge label="DATASET" />
        </div>
        <p className="text-xs text-gray-500 mb-3">
          UPI failure is a stadium-wide metric (not per site). Last-match peak: 7.11% at 21:00 (Innings break)
          vs ~1.1% on a normal day. Target: ~1–1.5%.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={upiData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis dataKey="phase" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} unit="%" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff' }} />
            <ReferenceLine y={1.5} stroke="#22c55e" strokeDasharray="4 2"
              label={{ value: '1.5% target', fill: '#9ca3af', fontSize: 9, position: 'right' }} />
            <Bar dataKey="Last match" fill="#E40000" radius={[3,3,0,0]} />
            <Bar dataKey="Normal day" fill="#374151" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* UPI data table */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">UPI Failure Data <LabelBadge label="DATASET" /></h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-airtel-charcoal-light">
              <th className="text-left pb-2">Phase (time)</th>
              <th className="text-right pb-2">Last Match</th>
              <th className="text-right pb-2">Normal Day</th>
              <th className="text-right pb-2">Gap</th>
              <th className="text-right pb-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-airtel-charcoal-light">
            {data.upi_data.map((u: any, i: number) => {
              const gap = u.last_match_upi_failure_pct - u.normal_day_upi_failure_pct
              const meets = u.last_match_upi_failure_pct <= 1.5
              return (
                <tr key={i} className="hover:bg-white/5">
                  <td className="py-1.5 font-medium text-gray-300">{u.phase}</td>
                  <td className={`py-1.5 text-right font-mono font-bold ${u.last_match_upi_failure_pct > 3 ? 'text-red-400' : 'text-amber-300'}`}>
                    {u.last_match_upi_failure_pct != null ? `${u.last_match_upi_failure_pct}%` : 'no data'}
                  </td>
                  <td className="py-1.5 text-right font-mono text-gray-400">
                    {u.normal_day_upi_failure_pct != null ? `${u.normal_day_upi_failure_pct}%` : 'no data'}
                  </td>
                  <td className={`py-1.5 text-right font-mono ${gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {u.last_match_upi_failure_pct != null ? `+${gap.toFixed(2)}pp` : 'no data'}
                  </td>
                  <td className="py-1.5 text-right">
                    {meets ? (
                      <span className="text-green-400 font-semibold">✓ Meets target</span>
                    ) : (
                      <span className="text-red-400 font-semibold">✗ Exceeds 1.5%</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="text-xs text-gray-500 mt-2">Target: ≤ 1.5% <LabelBadge label="TARGET" /></div>
      </div>

      {/* QoS actions */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield size={14} className="text-airtel-red" />
          Planned QoS Actions <LabelBadge label="SIMULATION" />
        </h2>
        {[
          {
            title: 'Priority QoS for UPI/POS',
            detail: 'QCI-6 / GBR bearer on stall-facing cells. 5% dedicated PRBs reserved for payment traffic during concession periods.',
            caveat: 'Cannot guarantee end-to-end success. Payment gateway and internet path are outside RAN control.',
            icon: '💳',
          },
          {
            title: 'Emergency Call Protection',
            detail: 'Highest priority QoS class (QCI-1) with pre-emption capability. VoLTE anchored on low-band (B8/B28) for in-building penetration. Resilient backhaul path with failover.',
            caveat: null,
            icon: '🚨',
          },
          {
            title: 'Backhaul Reservation',
            detail: 'Dedicated backhaul bandwidth slice for emergency and UPI traffic. MPLS QoS marking at RAN gateway.',
            caveat: 'S1/S2 on 1 Gbps fibre — upgrade to 10 Gbps is budgeted and must be completed before the match.',
            icon: '🔗',
          },
        ].map(action => (
          <div key={action.title} className="border border-airtel-charcoal-light rounded p-3 text-xs space-y-1">
            <div className="font-semibold text-white">{action.icon} {action.title}</div>
            <div className="text-gray-300">{action.detail}</div>
            {action.caveat && (
              <div className="text-amber-300 flex items-start gap-1">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                {action.caveat}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
