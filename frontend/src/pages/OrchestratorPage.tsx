import React, { useState } from 'react'
import { api } from '../lib/api'
import type { OrchestratorResult } from '../types'
import { LabelBadge } from '../components/LabelBadge'
import { SimBanner, Disclaimer } from '../components/Disclaimer'
import { PhaseSelector } from '../components/PhaseSelector'
import { CheckCircle, Circle, AlertTriangle, Zap, Shield } from 'lucide-react'

const PHASES = ['Crowd building up', 'Innings break', 'Final over', 'Post-match']
const PHASE_DISPLAY: Record<string, string> = {
  'Crowd building up': 'Crowd building up (17:00)',
  'Innings break': 'Innings break (21:00)',
  'Final over': 'Final over (22:45)',
  'Post-match': 'Post-match (23:15)',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  done:    <CheckCircle size={16} className="text-green-400 shrink-0" />,
  skipped: <Circle size={16} className="text-gray-600 shrink-0" />,
  running: <Zap size={16} className="text-amber-400 shrink-0 animate-pulse" />,
  pending: <Circle size={16} className="text-gray-500 shrink-0" />,
}

export function OrchestratorPage() {
  const [phase, setPhase] = useState('Innings break')
  const [result, setResult] = useState<OrchestratorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [activated, setActivated] = useState(false)

  const activate = () => {
    setLoading(true)
    setErr('')
    setActivated(false)
    api.activateOrchestrator(phase)
      .then(r => { setResult(r); setLoading(false); setActivated(true) })
      .catch(() => { setErr('Could not activate orchestrator.'); setLoading(false) })
  }

  const handlePhase = (d: string) => {
    const p = PHASES.find(p => PHASE_DISPLAY[p] === d) ?? phase
    setPhase(p)
    setResult(null)
    setActivated(false)
  }

  return (
    <div className="p-6 h-full overflow-y-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-airtel-red" />
            SYNC PULSE Orchestrator
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Match-phase automated playbook with explicit trigger rules</p>
        </div>
        <Disclaimer />
      </div>

      <SimBanner />

      {/* Trigger rules reference */}
      <div className="card text-xs space-y-2">
        <div className="font-semibold text-gray-300 mb-1">Trigger Rules <LabelBadge label="SIMULATION" /></div>
        {[
          ['≥ 70%', 'Move 4G users to other bands and under-loaded neighbours (M6 first)'],
          ['≥ 80%', 'Activate Cells on Wheels and in-bowl small cells'],
          ['EN-DC block', 'Tune 5G admission thresholds — Note: NSA anchor dependency remains; SA 5G is longer-term'],
          ['UPI/POS', 'Priority QoS (QCI-6/GBR) on stall-facing cells — Note: cannot guarantee end-to-end UPI success'],
          ['Always', 'Emergency: pre-emption, VoLTE low-band, resilient backhaul'],
        ].map(([trigger, action], i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-airtel-red font-bold shrink-0 w-16">{trigger}</span>
            <span className="text-gray-400">{action}</span>
          </div>
        ))}
      </div>

      {/* Phase selector + activate */}
      <div className="flex items-center gap-4 flex-wrap">
        <PhaseSelector
          phases={PHASES.map(p => PHASE_DISPLAY[p])}
          selected={PHASE_DISPLAY[phase]}
          onChange={handlePhase}
        />
        <button
          onClick={activate}
          disabled={loading}
          className={`btn-primary flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Zap size={14} />
          {loading ? 'Activating…' : '⚡ ACTIVATE SYNC PULSE'}
        </button>
      </div>

      {err && <div className="text-red-400 text-sm">{err}</div>}

      {result && activated && (
        <>
          {/* Before / After */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-white">Before SYNC PULSE</span>
                <LabelBadge label="DATASET" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Congested sites (≥80% load)</span>
                  <span className="font-mono text-red-400">{result.before_summary.congested_sites}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg anchor load</span>
                  <span className="font-mono text-red-400">{result.before_summary.avg_anchor_load_pct}%</span>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-white">After SYNC PULSE</span>
                <LabelBadge label="SIMULATION" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Congested sites (sim)</span>
                  <span className="font-mono text-green-400">{result.after_summary.congested_sites_sim}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg anchor load (sim)</span>
                  <span className="font-mono text-green-400">{result.after_summary.avg_anchor_load_pct_sim}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">5G success (sim)</span>
                  <span className="font-mono text-green-400">{result.after_summary.five_g_success_improvement}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">UPI target</span>
                  <span className="font-mono text-amber-300">{result.after_summary.upi_failure_target}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Saving */}
          <div className="card text-xs text-gray-300 leading-relaxed">
            <span className="font-semibold text-white">Saving vs "just add cells" plan: </span>
            {result.saving_vs_just_add_cells} &nbsp;<LabelBadge label="MODEL" />
          </div>

          {/* Step-by-step playbook */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Playbook Steps</h2>
            {result.steps.map(step => (
              <div key={step.step_id}
                className={`card flex gap-3 items-start transition-all
                  ${step.status === 'done' ? 'border-green-800' : step.status === 'skipped' ? 'opacity-50' : ''}`}>
                {STATUS_ICON[step.status] ?? <Circle size={16} className="text-gray-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold text-white text-sm">{step.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium
                        ${step.status === 'done' ? 'bg-green-900/50 text-green-400' :
                          step.status === 'skipped' ? 'bg-gray-800 text-gray-500' :
                          'bg-amber-900/50 text-amber-400'}`}>
                        {step.status.toUpperCase()}
                      </span>
                      <LabelBadge label={step.label} />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Trigger: {step.trigger}</div>
                  <div className="text-xs text-gray-300 mt-1 leading-relaxed">{step.action}</div>
                  {step.result && (
                    <div className="mt-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-800 rounded px-2 py-1">
                      {step.result}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Side effects panel */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              Side Effects &amp; Mitigations (Case Task 4)
            </h2>
            <div className="space-y-3">
              {result.side_effects.map((se, i) => (
                <div key={i} className="border border-airtel-charcoal-light rounded p-3 text-xs space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-2">
                    {se.effect} <LabelBadge label={se.label} />
                  </div>
                  <div className="text-gray-300">{se.description}</div>
                  <div className="text-green-300 flex items-start gap-1">
                    <Shield size={11} className="mt-0.5 shrink-0" />
                    <span>Mitigation: {se.mitigation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulas used */}
          <div className="card text-xs">
            <h2 className="text-sm font-semibold text-white mb-2">Technical Notes</h2>
            <ul className="space-y-1 text-gray-400 leading-relaxed">
              <li>• <span className="text-white font-medium">NSA 5G anchor dependency:</span> In Non-Standalone 5G, the LTE anchor (B3) controls EN-DC setup. A congested anchor blocks 5G connections even when 5G spectrum (n78) is idle.</li>
              <li>• <span className="text-white font-medium">Idle-mode priority:</span> Does NOT remove the NSA anchor dependency. It only redirects idle UEs to 5G cells — once attached via EN-DC the anchor is still required.</li>
              <li>• <span className="text-white font-medium">Standalone 5G (SA):</span> SA removes the LTE anchor dependency and would fully decouple 5G connections. This requires SA core upgrade and device support — a longer-term option, not achievable in 60 days.</li>
              <li>• <span className="text-white font-medium">UPI end-to-end:</span> Network QoS (QCI priority, GBR bearer) reduces RAN-side packet loss but cannot control the payment gateway, internet path, or bank availability.</li>
            </ul>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="text-center text-gray-500 py-12">
          <Zap size={40} className="mx-auto mb-3 text-gray-700" />
          <p>Select a match phase and press <strong className="text-white">ACTIVATE SYNC PULSE</strong> to run the playbook.</p>
          <p className="text-xs mt-2">Demo story: try "Innings break (21:00)" — the surge scenario.</p>
        </div>
      )}
    </div>
  )
}
