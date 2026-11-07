
import React, { useState } from 'react'
import { api, type FailureCascadeResult } from '../lib/api'
import type { CrowdSimulationResult, OrchestratorResult } from '../types'
import {
  AlertTriangle,
  Shield,
  Radio,
  Users,
  Zap,
  CheckCircle,
  Loader2,
  Activity,
  ClipboardCheck,
} from 'lucide-react'

type Scenario = 'site_failure' | 'crowd_surge' | 'emergency_response'

const PHASES = [
  'Crowd building up',
  'Innings break',
  'Final over',
  'Post-match',
]

const SITES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'S1', 'S2']

export function EmergencyDrillPage() {
  const [scenario, setScenario] = useState<Scenario>('site_failure')
  const [phase, setPhase] = useState('Innings break')
  const [failedSite, setFailedSite] = useState('M5')
  const [crowdSize, setCrowdSize] = useState(100000)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [failureResult, setFailureResult] = useState<FailureCascadeResult | null>(null)
  const [crowdResult, setCrowdResult] = useState<CrowdSimulationResult | null>(null)
  const [orchestratorResult, setOrchestratorResult] = useState<OrchestratorResult | null>(null)

  const clearResults = () => {
    setFailureResult(null)
    setCrowdResult(null)
    setOrchestratorResult(null)
    setError('')
  }

  const runDrill = async () => {
    setLoading(true)
    clearResults()

    try {
      if (scenario === 'site_failure') {
        const result = await api.failureCascade(
          failedSite,
          phase,
          crowdSize
        )
        setFailureResult(result)
      } else if (scenario === 'crowd_surge') {
        const result = await api.crowdSimulation(
          crowdSize,
          phase
        )
        setCrowdResult(result)
      } else {
        const result = await api.activateOrchestrator(phase)
        setOrchestratorResult(result)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to run the drill. Check whether the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  const riskColor = (risk: string) => {
    const value = risk.toUpperCase()
    if (value === 'CRITICAL' || value === 'FAILED') return 'text-red-400 bg-red-500/10 border-red-500/30'
    if (value === 'HIGH') return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    if (value === 'MODERATE') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    return 'text-green-400 bg-green-500/10 border-green-500/30'
  }

  const scenarios = [
    {
      id: 'site_failure' as Scenario,
      title: 'Site Failure',
      description: 'Simulate one network site going offline and observe traffic redistribution.',
      icon: <Radio size={20} />,
    },
    {
      id: 'crowd_surge' as Scenario,
      title: 'Sudden Crowd Surge',
      description: 'Simulate a sudden increase in stadium attendance and network demand.',
      icon: <Users size={20} />,
    },
    {
      id: 'emergency_response' as Scenario,
      title: 'Emergency Response',
      description: 'Run the existing SYNC PULSE response playbook for the selected match phase.',
      icon: <Shield size={20} />,
    },
  ]

  const selectedScenario = scenarios.find(item => item.id === scenario)!

  return (
    <div className="h-full overflow-y-auto p-6 text-gray-200 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="text-airtel-red" size={23} />
          <h1 className="text-2xl font-bold text-white">Digital Emergency Drill</h1>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Test how SYNC PULSE responds to simulated stadium network emergencies.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded border border-orange-700/50 bg-orange-950/30 px-3 py-2 text-xs text-orange-300">
          <AlertTriangle size={14} />
          SIMULATION ONLY — No real Airtel network infrastructure is controlled.
        </div>
      </div>

      {/* Scenario selection */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          1. Select emergency scenario
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scenarios.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setScenario(item.id)
                clearResults()
              }}
              className={`text-left rounded-lg border p-4 transition-colors ${
                scenario === item.id
                  ? 'border-airtel-red bg-airtel-red/10'
                  : 'border-gray-700 bg-airtel-charcoal-mid hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2 text-white font-semibold">
                <span className="text-airtel-red">{item.icon}</span>
                {item.title}
              </div>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Configuration */}
      <section className="rounded-lg border border-gray-700 bg-airtel-charcoal-mid p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          2. Configure the drill
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-xs text-gray-400 space-y-2">
            Match phase
            <select
              value={phase}
              onChange={e => {
                setPhase(e.target.value)
                clearResults()
              }}
              className="w-full rounded border border-gray-600 bg-airtel-charcoal px-3 py-2 text-sm text-white"
            >
              {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          {scenario === 'site_failure' && (
            <label className="text-xs text-gray-400 space-y-2">
              Site to simulate as failed
              <select
                value={failedSite}
                onChange={e => {
                  setFailedSite(e.target.value)
                  clearResults()
                }}
                className="w-full rounded border border-gray-600 bg-airtel-charcoal px-3 py-2 text-sm text-white"
              >
                {SITES.map(site => <option key={site} value={site}>{site}</option>)}
              </select>
            </label>
          )}

          {scenario !== 'emergency_response' && (
            <label className="text-xs text-gray-400 space-y-2">
              Stadium crowd size
              <input
                type="number"
                min={1}
                value={crowdSize}
                onChange={e => {
                  setCrowdSize(Math.max(1, Number(e.target.value)))
                  clearResults()
                }}
                className="w-full rounded border border-gray-600 bg-airtel-charcoal px-3 py-2 text-sm text-white"
              />
            </label>
          )}
        </div>

        <button
          onClick={runDrill}
          disabled={loading || (scenario !== 'emergency_response' && crowdSize < 1)}
          className="inline-flex items-center gap-2 rounded bg-airtel-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Running drill...</>
            : <><Zap size={16} /> Run Emergency Drill</>}
        </button>
      </section>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
          <p className="mt-1 text-xs text-red-400">
            Make sure the FastAPI backend is running on port 8000.
          </p>
        </div>
      )}

      {/* Results */}
      {(failureResult || crowdResult || orchestratorResult) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              3. Emergency drill report
            </h2>
            <span className="rounded border border-green-700/50 bg-green-950/30 px-2 py-1 text-xs text-green-300">
              <CheckCircle size={12} className="inline mr-1" />
              Simulation completed
            </span>
          </div>

          <div className="rounded-lg border border-gray-700 bg-airtel-charcoal-mid p-4">
            <div className="text-xs text-gray-500">SCENARIO</div>
            <div className="mt-1 text-lg font-semibold text-white">{selectedScenario.title}</div>
            <div className="text-xs text-gray-400 mt-1">
              Match phase: {phase} · Crowd: {crowdSize.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Site failure result */}
          {failureResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="Estimated network demand" value={`${failureResult.total_demand_gbps.toFixed(2)} Gbps`} />
                <Metric label="Failed site" value={failureResult.failed_site} />
                <Metric label="Critical sites" value={String(failureResult.critical_sites)} />
                <Metric label="High-risk sites" value={String(failureResult.high_risk_sites)} />
              </div>

              <div className="rounded-lg border border-gray-700 bg-airtel-charcoal-mid p-4">
                <h3 className="font-semibold text-white mb-3">Site impact report</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-gray-500 border-b border-gray-700">
                      <tr>
                        <th className="py-2 pr-3">Site</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Traffic after (Gbps)</th>
                        <th className="py-2 pr-3">Radio risk</th>
                        <th className="py-2">Overall risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failureResult.sites.map(site => (
                        <tr key={site.site} className="border-b border-gray-800">
                          <td className="py-3 pr-3 font-semibold text-white">{site.site}</td>
                          <td className="py-3 pr-3">{site.status}</td>
                          <td className="py-3 pr-3">{site.traffic_after_gbps.toFixed(3)}</td>
                          <td className="py-3 pr-3">{site.radio_risk}</td>
                          <td className="py-3">
                            <span className={`rounded border px-2 py-1 ${riskColor(site.overall_risk)}`}>
                              {site.overall_risk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <RecommendationList items={failureResult.recommendations} />
              <AssumptionList items={failureResult.assumptions} />
            </>
          )}

          {/* Crowd surge result */}
          {crowdResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="Estimated Airtel users" value={crowdResult.airtel_users_estimated.toLocaleString('en-IN')} />
                <Metric label="Active data users" value={crowdResult.active_users_estimated.toLocaleString('en-IN')} />
                <Metric label="Total demand" value={`${crowdResult.total_demand_gbps.toFixed(2)} Gbps`} />
                <Metric label="Demand per site" value={`${crowdResult.traffic_per_site_gbps.toFixed(3)} Gbps`} />
              </div>

              <div className="rounded-lg border border-gray-700 bg-airtel-charcoal-mid p-4">
                <h3 className="font-semibold text-white mb-3">Network risk by site</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {crowdResult.sites.map(site => (
                    <div key={site.site} className="rounded border border-gray-700 bg-airtel-charcoal p-3">
                      <div className="font-semibold text-white">{site.site}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Radio load: {site.baseline_radio_load_pct.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Added backhaul: {site.added_backhaul_utilization_pct.toFixed(1)}%
                      </div>
                      <span className={`inline-block mt-2 rounded border px-2 py-1 text-xs ${riskColor(site.overall_risk)}`}>
                        {site.overall_risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <AssumptionList items={crowdResult.assumptions} />
            </>
          )}

          {/* Emergency response result */}
          {orchestratorResult && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Congested sites before" value={String(orchestratorResult.before_summary.congested_sites)} />
                <Metric label="Average anchor load before" value={`${orchestratorResult.before_summary.avg_anchor_load_pct.toFixed(1)}%`} />
              </div>

              <div className="rounded-lg border border-gray-700 bg-airtel-charcoal-mid p-4">
                <h3 className="font-semibold text-white mb-4">Response playbook</h3>
                <div className="space-y-4">
                  {orchestratorResult.steps.map((step, index) => (
                    <div key={step.step_id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`rounded-full p-2 ${step.status === 'done' ? 'bg-green-500/15 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                          <CheckCircle size={16} />
                        </div>
                        {index !== orchestratorResult.steps.length - 1 && (
                          <div className="w-px flex-1 min-h-6 bg-gray-700 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white text-sm">{step.name}</span>
                          <span className="text-[10px] uppercase text-green-400">{step.status}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{step.trigger}</p>
                        <p className="text-xs text-gray-300 mt-1">{step.action}</p>
                        {step.result && <p className="text-xs text-green-300 mt-1">{step.result}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <RecommendationList items={orchestratorResult.side_effects.map(item => `${item.effect}: ${item.mitigation}`)} />
            </>
          )}

          <div className="rounded border border-orange-800/50 bg-orange-950/20 p-3 text-xs text-orange-300">
            <Activity size={14} className="inline mr-1" />
            This report contains simulated estimates and recommendations. It is not a live network measurement or an executed network action.
          </div>
        </section>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-airtel-charcoal-mid p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-white">{value}</div>
    </div>
  )
}

function RecommendationList({ items }: { items: string[] }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-airtel-charcoal-mid p-4">
      <h3 className="font-semibold text-white mb-3">Recommended actions / mitigations</h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-xs text-gray-300">
            <Zap size={14} className="shrink-0 text-airtel-red" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AssumptionList({ items }: { items: string[] }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-airtel-charcoal-mid p-4">
      <h3 className="font-semibold text-white mb-2">Simulation assumptions</h3>
      <ul className="list-disc pl-5 space-y-1 text-xs text-gray-400">
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  )
}
