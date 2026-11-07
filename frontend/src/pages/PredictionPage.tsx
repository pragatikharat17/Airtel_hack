
import React, { useEffect, useState } from 'react'
import { api, type FailureCascadeResult } from '../lib/api'
import type { SimulatePhaseResponse } from '../types'
import { LabelBadge } from '../components/LabelBadge'
import { RiskBadge, RiskBar } from '../components/RiskBadge'
import { PhaseSelector } from '../components/PhaseSelector'
import { Disclaimer } from '../components/Disclaimer'
import { AlertTriangle, Radio, Zap, Activity } from 'lucide-react'

const PHASES = [
  'Crowd building up',
  'Innings break',
  'Final over',
  'Post-match',
]

const PHASE_DISPLAY: Record<string, string> = {
  'Crowd building up': 'Crowd building up (17:00)',
  'Innings break': 'Innings break (21:00)',
  'Final over': 'Final over (22:45)',
  'Post-match': 'Post-match (23:15)',
}

const SITES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'S1', 'S2']

const riskOrder: Record<string, number> = {
  Critical: 4,
  High: 3,
  Moderate: 2,
  Low: 1,
  Unknown: 0,
}

function riskColour(risk: string) {
  if (risk === 'CRITICAL') return 'text-red-400'
  if (risk === 'HIGH') return 'text-orange-400'
  if (risk === 'MODERATE') return 'text-yellow-400'
  if (risk === 'LOW') return 'text-green-400'
  return 'text-gray-400'
}

export function PredictionPage() {
  const [phase, setPhase] = useState('Innings break')

  // Existing congestion prediction
  const [result, setResult] = useState<SimulatePhaseResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // New failure cascade simulation
  const [failedSite, setFailedSite] = useState('M5')
  const [crowdSize, setCrowdSize] = useState(100000)
  const [cascadeResult, setCascadeResult] =
    useState<FailureCascadeResult | null>(null)
  const [cascadeLoading, setCascadeLoading] = useState(false)
  const [cascadeError, setCascadeError] = useState('')

  const run = (p: string) => {
    setLoading(true)
    setErr('')

    api.simulatePhase(p)
      .then(r => setResult(r))
      .catch(() => setErr('Could not load prediction.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    run('Innings break')
  }, [])

  const handlePhase = (p: string) => {
    setPhase(p)
    run(p)
    setCascadeResult(null)
  }

  const sorted = [...(result?.site_assessments ?? [])].sort(
    (a, b) =>
      (riskOrder[b.risk_level] ?? 0) -
      (riskOrder[a.risk_level] ?? 0)
  )

  const runFailureSimulation = async () => {
    if (!Number.isFinite(crowdSize) || crowdSize <= 0) {
      setCascadeError('Enter a valid crowd size greater than zero.')
      return
    }

    setCascadeLoading(true)
    setCascadeError('')
    setCascadeResult(null)

    try {
      const response = await api.failureCascade(
        failedSite,
        phase,
        crowdSize
      )
      setCascadeResult(response)
    } catch (error) {
      setCascadeError(
        error instanceof Error
          ? error.message
          : 'Could not run failure simulation.'
      )
    } finally {
      setCascadeLoading(false)
    }
  }

  return (
    <div className="p-6 h-full overflow-y-auto space-y-5">

      {/* PAGE HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">
            Network Prediction & Failure Intelligence
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Congestion prediction and intelligent network failure simulation
          </p>
        </div>
        <Disclaimer />
      </div>

      {/* EXISTING CONGESTION PREDICTION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity size={17} className="text-red-400" />
          <h2 className="text-base font-bold text-white">
            1. Network Congestion Prediction
          </h2>
        </div>

        <div className="card text-xs space-y-1">
          <div className="font-semibold text-gray-300 mb-2">
            Risk Rules <LabelBadge label="MODEL" />
          </div>

          {[
            ['Low', '#22c55e', 'Anchor load < 60%'],
            ['Moderate', '#eab308', '60% ≤ anchor load < 80%'],
            ['High', '#f97316', '80% ≤ anchor load < 95%'],
            ['Critical', '#ef4444', 'Anchor load ≥ 95%'],
          ].map(([level, color, rule]) => (
            <div key={level} className="flex items-center gap-2">
              <span
                style={{ background: color }}
                className="w-3 h-3 rounded-sm inline-block"
              />
              <span
                className="font-semibold"
                style={{ color }}
              >
                {level}
              </span>
              <span className="text-gray-400">— {rule}</span>
            </div>
          ))}

          <div className="text-amber-300 mt-1 flex items-center gap-1">
            <AlertTriangle size={11} />
            Flag when 5G connection success is below 90%
          </div>

          <p className="text-gray-500 italic mt-1">
            In NSA 5G, the LTE anchor controls EN-DC setup.
            A congested anchor can block 5G connections even
            when 5G spectrum is available.
          </p>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-2">
            Select match phase:
          </div>

          <PhaseSelector
            phases={PHASES.map(p => PHASE_DISPLAY[p])}
            selected={PHASE_DISPLAY[phase]}
            onChange={d =>
              handlePhase(
                PHASES.find(p => PHASE_DISPLAY[p] === d) ?? phase
              )
            }
          />
        </div>

        {loading && (
          <div className="text-gray-400 animate-pulse text-sm">
            Running prediction…
          </div>
        )}

        {err && (
          <div className="text-red-400 text-sm">{err}</div>
        )}

        {result && !loading && (
          <>
            <div className="text-xs text-gray-400">
              Phase: <span className="text-white font-semibold">
                {PHASE_DISPLAY[phase]}
              </span>
              {' '}— sorted by risk (highest first)
              <LabelBadge label="MODEL" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sorted.map(a => (
                <div key={a.site} className="card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-base">
                      {a.site}
                    </span>

                    <div className="flex items-center gap-2">
                      {a.success_flag && (
                        <span className="text-xs text-amber-300 border border-amber-700 bg-amber-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle size={10} />
                          5G success &lt; 90%
                        </span>
                      )}
                      <RiskBadge level={a.risk_level} />
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-32 shrink-0">
                        4G anchor load
                      </span>
                      <RiskBar load={a.anchor_load_pct} />
                      <LabelBadge label="DATASET" />
                    </div>

                    {a.five_g_success_pct !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-32 shrink-0">
                          5G success
                        </span>
                        <span className={`font-mono ${
                          a.five_g_success_pct < 90
                            ? 'text-red-400'
                            : 'text-green-400'
                        }`}>
                          {a.five_g_success_pct}%
                        </span>
                        <LabelBadge label="DATASET" />
                      </div>
                    )}
                  </div>

                  <div className="bg-airtel-charcoal/50 rounded p-2 text-xs text-gray-300 leading-relaxed">
                    {a.explanation}
                  </div>

                  <div className="text-right">
                    <LabelBadge label={a.label} />
                  </div>
                </div>
              ))}
            </div>

            {sorted[0]?.model_fit && (
              <div className="card text-xs space-y-1">
                <div className="font-semibold text-gray-300">
                  Linear Model: 5G Success ~ Anchor Load
                  <LabelBadge label="MODEL" />
                </div>
                <p className="text-gray-400">
                  {sorted[0].model_fit.formula}
                </p>
                <p className="text-amber-300">
                  CV MAE: {sorted[0].model_fit.cv_mae_pct} pp
                  (leave-one-site-out)
                </p>
                <p className="text-gray-500 italic">
                  {sorted[0].model_fit.warning}
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {/* NEW FAILURE CASCADE FEATURE */}
      <section className="space-y-4 pt-4 border-t border-gray-700">

        <div className="flex items-center gap-2">
          <Zap size={19} className="text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-white">
              2. Intelligent Network Failure Cascade Prediction
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Simulate how one site failure affects the remaining network.
            </p>
          </div>
        </div>

        {/* INPUT PANEL */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-300 font-semibold">
            <Radio size={15} className="text-amber-400" />
            FAILURE SCENARIO CONFIGURATION
            <LabelBadge label="SIMULATION" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Select site to simulate failure
              </label>

              <select
                value={failedSite}
                onChange={e => setFailedSite(e.target.value)}
                className="w-full bg-airtel-charcoal border border-gray-600 rounded p-3 text-sm text-white"
              >
                {SITES.map(site => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Expected crowd size
              </label>

              <input
                type="number"
                min="1"
                value={crowdSize}
                onChange={e =>
                  setCrowdSize(Number(e.target.value))
                }
                className="w-full bg-airtel-charcoal border border-gray-600 rounded p-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Selected match phase
              </label>
              <div className="bg-airtel-charcoal border border-gray-700 rounded p-3 text-sm text-white">
                {PHASE_DISPLAY[phase]}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Estimated Airtel share
              </label>
              <div className="bg-airtel-charcoal border border-gray-700 rounded p-3 text-sm text-white">
                40% <span className="text-gray-500">(assumption)</span>
              </div>
            </div>
          </div>

          <button
            onClick={runFailureSimulation}
            disabled={cascadeLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg p-3 transition-colors"
          >
            {cascadeLoading
              ? 'Simulating Network Failure...'
              : `Simulate ${failedSite} Site Failure`}
          </button>

          {cascadeError && (
            <p className="text-red-400 text-xs">{cascadeError}</p>
          )}
        </div>

        {/* SIMULATION RESULTS */}
        {cascadeResult && (
          <div className="space-y-4">

            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-white">
                Failure Simulation Results
              </h3>
              <LabelBadge label="SIMULATION" />
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              <div className="card">
                <p className="text-xs text-gray-400">
                  Failed Site
                </p>
                <p className="text-xl font-bold text-red-400 mt-2">
                  {cascadeResult.failed_site}
                </p>
              </div>

              <div className="card">
                <p className="text-xs text-gray-400">
                  Total Demand
                </p>
                <p className="text-xl font-bold text-white mt-2">
                  {cascadeResult.total_demand_gbps} Gbps
                </p>
              </div>

              <div className="card">
                <p className="text-xs text-gray-400">
                  Traffic per Active Site
                </p>
                <p className="text-xl font-bold text-amber-400 mt-2">
                  {cascadeResult.redistributed_traffic_per_site_gbps}
                </p>
                <p className="text-xs text-gray-500">Gbps</p>
              </div>

              <div className="card">
                <p className="text-xs text-gray-400">
                  Additional Traffic
                </p>
                <p className="text-xl font-bold text-orange-400 mt-2">
                  +{cascadeResult.additional_traffic_per_site_gbps}
                </p>
                <p className="text-xs text-gray-500">Gbps per active site</p>
              </div>
            </div>

            {/* FAILURE IMPACT SUMMARY */}
            <div className="card space-y-3">
              <h3 className="text-sm font-bold text-white">
                Network Impact Analysis
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-airtel-charcoal rounded p-3">
                  <p className="text-xs text-gray-400">
                    Critical-risk active sites
                  </p>
                  <p className="text-2xl font-bold text-red-400">
                    {cascadeResult.critical_sites}
                  </p>
                </div>

                <div className="bg-airtel-charcoal rounded p-3">
                  <p className="text-xs text-gray-400">
                    High-risk active sites
                  </p>
                  <p className="text-2xl font-bold text-orange-400">
                    {cascadeResult.high_risk_sites}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                The failed site is excluded from redistribution.
                Remaining sites receive an equal share of estimated
                network demand.
              </p>
            </div>

            {/* SITE-WISE CASCADE TABLE */}
            <div className="card space-y-3">
              <h3 className="text-sm font-bold text-white">
                Site-wise Failure Impact
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="p-2">Site</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Radio Load</th>
                      <th className="p-2">Traffic</th>
                      <th className="p-2">BH Demand / Capacity</th>
                      <th className="p-2">Overall Risk</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cascadeResult.sites.map(site => (
                      <tr
                        key={site.site}
                        className="border-b border-gray-800"
                      >
                        <td className="p-2 font-bold text-white">
                          {site.site}
                        </td>

                        <td className="p-2">
                          <span className={
                            site.status === 'FAILED'
                              ? 'text-red-400 font-semibold'
                              : 'text-green-400'
                          }>
                            {site.status}
                          </span>
                        </td>

                        <td className="p-2 text-gray-300">
                          {site.baseline_radio_load_pct !== null
                            ? `${site.baseline_radio_load_pct}%`
                            : '—'}
                        </td>

                        <td className="p-2 text-gray-300">
                          {site.traffic_after_gbps} Gbps
                        </td>

                        <td className="p-2 text-gray-300">
                          {site.estimated_backhaul_demand_pct !== null
                            ? `${site.estimated_backhaul_demand_pct}%`
                            : '—'}
                          {site.backhaul_capacity_gbps !== null
                            ? ` / ${site.backhaul_capacity_gbps} Gbps`
                            : ''}
                        </td>

                        <td className={`p-2 font-bold ${riskColour(site.overall_risk)}`}>
                          {site.overall_risk}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500">
                Radio risk uses the original dataset. Backhaul risk
                uses estimated traffic demand divided by capacity.
              </div>
            </div>

            {/* PRE-EXISTING VS FAILURE IMPACT */}
            <div className="card space-y-3">
              <h3 className="text-sm font-bold text-white">
                What changed because of the failure?
              </h3>

              <div className="space-y-2 text-xs text-gray-300">
                <p>
                  <span className="text-gray-400">
                    Before failure:
                  </span>{' '}
                  Each site was allocated approximately{' '}
                  <strong>
                    {cascadeResult.original_traffic_per_site_gbps} Gbps
                  </strong>.
                </p>

                <p>
                  <span className="text-gray-400">
                    After failure:
                  </span>{' '}
                  Each remaining site receives approximately{' '}
                  <strong className="text-amber-400">
                    {cascadeResult.redistributed_traffic_per_site_gbps} Gbps
                  </strong>.
                </p>

                <p>
                  <span className="text-gray-400">
                    Extra traffic:
                  </span>{' '}
                  <strong className="text-orange-400">
                    +{cascadeResult.additional_traffic_per_site_gbps} Gbps
                  </strong>{' '}
                  per remaining site.
                </p>
              </div>

              <p className="text-xs text-amber-300">
                Important: Radio congestion may already exist before
                the failure. The additional traffic is the simulated
                impact of the failure, not proof that the failure
                caused all existing congestion.
              </p>
            </div>

            {/* RECOMMENDATIONS */}
            <div className="card space-y-3">
              <h3 className="text-sm font-bold text-white">
                Recommended Network Actions
              </h3>

              {cascadeResult.recommendations.map((item, index) => (
                <div key={index} className="flex gap-2 text-xs text-gray-300">
                  <span className="text-amber-400 font-bold">
                    {index + 1}.
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* ASSUMPTIONS */}
            <div className="card space-y-2">
              <h3 className="text-sm font-bold text-gray-300">
                Simulation Assumptions
                <LabelBadge label="ASSUMPTION" />
              </h3>

              {cascadeResult.assumptions.map((item, index) => (
                <p key={index} className="text-xs text-gray-500">
                  • {item}
                </p>
              ))}
            </div>

          </div>
        )}
      </section>
    </div>
  )
}
