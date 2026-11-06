import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Site, SimulatePhaseResponse, RiskAssessment } from '../types'
import { LabelBadge } from '../components/LabelBadge'
import { RiskBadge, RiskBar } from '../components/RiskBadge'
import { PhaseSelector } from '../components/PhaseSelector'
import { Disclaimer } from '../components/Disclaimer'
import { AlertTriangle, Info } from 'lucide-react'

const PHASES = ['Crowd building up', 'Innings break', 'Final over', 'Post-match']
const PHASE_DISPLAY: Record<string, string> = {
  'Crowd building up': 'Crowd building up (17:00)',
  'Innings break': 'Innings break (21:00)',
  'Final over': 'Final over (22:45)',
  'Post-match': 'Post-match (23:15)',
}

export function PredictionPage() {
  const [phase, setPhase] = useState('Innings break')
  const [result, setResult] = useState<SimulatePhaseResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const run = (p: string) => {
    setLoading(true)
    setErr('')
    api.simulatePhase(p)
      .then(r => { setResult(r); setLoading(false) })
      .catch(() => { setErr('Could not load prediction.'); setLoading(false) })
  }

  useEffect(() => { run('Innings break') }, [])

  const handlePhase = (p: string) => { setPhase(p); run(p) }

  const riskOrder: Record<string, number> = { Critical: 4, High: 3, Moderate: 2, Low: 1, Unknown: 0 }
  const sorted = [...(result?.site_assessments ?? [])].sort(
    (a, b) => (riskOrder[b.risk_level] ?? 0) - (riskOrder[a.risk_level] ?? 0)
  )

  return (
    <div className="p-6 h-full overflow-y-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Congestion Prediction</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Transparent rule-based risk score — no black-box ML (dataset: 32 rows, 8 sites)
          </p>
        </div>
        <Disclaimer />
      </div>

      {/* Rule legend */}
      <div className="card text-xs space-y-1">
        <div className="font-semibold text-gray-300 mb-2">Risk Rules <LabelBadge label="MODEL" /></div>
        {[
          ['Low',      '#22c55e', 'Anchor load < 60%'],
          ['Moderate', '#eab308', '60% ≤ anchor load < 80%'],
          ['High',     '#f97316', '80% ≤ anchor load < 95%'],
          ['Critical', '#ef4444', 'Anchor load ≥ 95%'],
        ].map(([level, color, rule]) => (
          <div key={String(level)} className="flex items-center gap-2">
            <span style={{ background: color as string }} className="w-3 h-3 rounded-sm inline-block" />
            <span className="font-semibold" style={{ color: color as string }}>{level}</span>
            <span className="text-gray-400">— {rule}</span>
          </div>
        ))}
        <div className="text-amber-300 mt-1 flex items-center gap-1">
          <AlertTriangle size={11} /> ⚠ flag when 5G connection success &lt; 90%
        </div>
        <p className="text-gray-500 italic mt-1">
          In NSA 5G, the LTE anchor controls EN-DC setup. A congested anchor blocks 5G connections
          even if 5G spectrum is available. Idle-mode priority does NOT remove this dependency.
        </p>
      </div>

      {/* Phase selector */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Select match phase:</div>
        <PhaseSelector
          phases={PHASES.map(p => PHASE_DISPLAY[p])}
          selected={PHASE_DISPLAY[phase]}
          onChange={d => handlePhase(PHASES.find(p => PHASE_DISPLAY[p] === d) ?? phase)}
        />
      </div>

      {loading && <div className="text-gray-400 animate-pulse text-sm">Running prediction…</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}

      {/* Risk cards grid */}
      {result && !loading && (
        <>
          <div className="text-xs text-gray-400">
            Phase: <span className="text-white font-semibold">{PHASE_DISPLAY[phase]}</span>
            &nbsp;— sorted by risk (highest first) &nbsp;<LabelBadge label="MODEL" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map(a => (
              <div key={a.site} className="card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">{a.site}</span>
                  <div className="flex items-center gap-2">
                    {a.success_flag && (
                      <span className="text-xs text-amber-300 border border-amber-700 bg-amber-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle size={10} /> 5G success &lt; 90%
                      </span>
                    )}
                    <RiskBadge level={a.risk_level} />
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-32 shrink-0">4G anchor load</span>
                    <RiskBar load={a.anchor_load_pct} />
                    <LabelBadge label="DATASET" />
                  </div>
                  {a.five_g_success_pct !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-32 shrink-0">5G success</span>
                      <span className={`font-mono ${a.five_g_success_pct < 90 ? 'text-red-400' : 'text-green-400'}`}>
                        {a.five_g_success_pct}%
                      </span>
                      <LabelBadge label="DATASET" />
                    </div>
                  )}
                </div>

                <div className="bg-airtel-charcoal/50 rounded p-2 text-xs text-gray-300 leading-relaxed">
                  {a.explanation}
                </div>
                <div className="text-right"><LabelBadge label={a.label} /></div>
              </div>
            ))}
          </div>

          {/* Model fit note */}
          {sorted[0]?.model_fit && (
            <div className="card text-xs space-y-1">
              <div className="font-semibold text-gray-300">Linear Model: 5G Success ~ Anchor Load <LabelBadge label="MODEL" /></div>
              <p className="text-gray-400">{sorted[0].model_fit.formula}</p>
              <p className="text-amber-300">CV MAE: {sorted[0].model_fit.cv_mae_pct} pp (leave-one-site-out)</p>
              <p className="text-gray-500 italic">{sorted[0].model_fit.warning}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
