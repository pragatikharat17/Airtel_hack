import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { BudgetItem, BudgetResult } from '../types'
import { LabelBadge } from '../components/LabelBadge'
import { Alert } from '../components/Alert'
import { DollarSign, AlertTriangle, Info } from 'lucide-react'

export function BudgetPage() {
  const [data, setData] = useState<(BudgetResult & { targets: Record<string, number> }) | null>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [simResult, setSimResult] = useState<BudgetResult | null>(null)
  const [overBudgetConfirmed, setOverBudgetConfirmed] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.budget().then(d => {
      setData(d)
      setItems(d.items)
      setSimResult(d)
    }).catch(() => setErr('Could not load budget data.'))
  }, [])

  const simulate = () => {
    setSimulating(true)
    api.simulateBudget(items, overBudgetConfirmed)
      .then(r => { setSimResult(r); setSimulating(false) })
      .catch(() => { setErr('Budget simulation failed.'); setSimulating(false) })
  }

  const updateQty = (idx: number, qty: number) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, qty: Math.max(0, qty), cost_lakh: Math.round(item.unit_cost_lakh * Math.max(0, qty) * 100) / 100 } : item
    )
    setItems(updated)
  }

  if (err && !data) return <div className="p-6 text-red-400">{err}</div>
  if (!data) return <div className="p-6 text-gray-400 animate-pulse">Loading budget…</div>

  const totalCost = items.reduce((s, i) => s + i.unit_cost_lakh * i.qty, 0)
  const reserve = 400 - totalCost
  const overBudget = totalCost > 400

  const deckTargets = [
    ['6 COWs (3-sector, 4G+5G) × Rs 25 L', 150],
    ['10 in-bowl small cells × Rs 8 L', 80],
    ['5G at M4 + fibre 0.38 km × Rs 50 L/km', 27],
    ['5G at M6 + fibre 0.45 km × Rs 50 L/km', 30.5],
    ['5G at S1 + 1G→10G uplift', 12],
    ['5G at S2 + 1G→10G uplift', 12],
    ['Standby COW', 25],
    ['Committed total', 336.5],
    ['Reserve', 63.5],
    ['Grand total (Rs 4 crore)', 400],
  ]

  return (
    <div className="p-6 h-full overflow-y-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <DollarSign size={18} className="text-airtel-red" />
          Budget Planner
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Rs 4 crore (Rs 400 lakh) total. All costs ASSUMPTION.</p>
      </div>

      {/* Fibre note */}
      <Alert severity="info">
        <span className="font-semibold">Fibre length note:</span> {data.fibre_note}
      </Alert>

      {/* Budget editor */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Line Items — Adjust Quantities</h2>
          <LabelBadge label="ASSUMPTION" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-airtel-charcoal-light">
                {['Item','Unit Cost (Rs L)','Qty','Cost (Rs L)','Note'].map(h => (
                  <th key={h} className="text-left pb-2 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-airtel-charcoal-light">
              {items.map((item, idx) => {
                const cost = item.unit_cost_lakh * item.qty
                return (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="py-2 pr-3 text-gray-300 max-w-[220px]">{item.name}</td>
                    <td className="py-2 pr-3 font-mono text-white text-right">{item.unit_cost_lakh.toFixed(1)}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        value={item.qty}
                        onChange={e => updateQty(idx, parseInt(e.target.value) || 0)}
                        className="w-14 bg-airtel-charcoal border border-airtel-charcoal-light rounded px-2 py-0.5 text-white font-mono text-center focus:border-airtel-red outline-none"
                      />
                    </td>
                    <td className={`py-2 pr-3 font-mono font-semibold text-right ${cost > 0 ? 'text-white' : 'text-gray-500'}`}>
                      {cost.toFixed(1)}
                    </td>
                    <td className="py-2 text-gray-500 text-xs">{item.note}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-airtel-red/40">
                <td colSpan={3} className="pt-2 font-bold text-gray-300">Committed Total</td>
                <td className={`pt-2 font-mono font-bold text-right text-lg ${overBudget ? 'text-red-400' : 'text-white'}`}>
                  {totalCost.toFixed(1)}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={3} className="pb-1 text-gray-400 text-xs">Reserve (of Rs 400 L)</td>
                <td className={`pb-1 font-mono text-right text-sm ${reserve < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {reserve.toFixed(1)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {overBudget && (
          <div className="mt-3 space-y-2">
            <Alert severity="error">
              Total Rs {totalCost.toFixed(1)} L exceeds the Rs 400 L hard cap.
              {!overBudgetConfirmed && ' Confirm below to proceed.'}
            </Alert>
            {!overBudgetConfirmed && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300">
                <input type="checkbox" onChange={e => setOverBudgetConfirmed(e.target.checked)}
                  className="rounded" />
                I confirm over-budget mode — this exceeds the Rs 4 crore approved budget.
              </label>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={simulate} disabled={simulating || (overBudget && !overBudgetConfirmed)}
            className={`btn-primary ${(simulating || (overBudget && !overBudgetConfirmed)) ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {simulating ? 'Simulating…' : 'Recalculate Budget'}
          </button>
          <button onClick={() => { setItems(data.items); setOverBudgetConfirmed(false) }} className="btn-ghost">
            Reset to Plan
          </button>
        </div>
      </div>

      {/* Submission deck target comparison */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-3">
          Submission Deck Targets <LabelBadge label="ASSUMPTION" />
        </h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-airtel-charcoal-light">
              <th className="text-left pb-2 font-medium">Item</th>
              <th className="text-right pb-2 font-medium">Deck Target (Rs L)</th>
              <th className="text-right pb-2 font-medium">Your Plan (Rs L)</th>
              <th className="text-right pb-2 font-medium">Match?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-airtel-charcoal-light">
            {deckTargets.map(([name, target]) => {
              // Find matching item cost
              let yourVal: number | null = null
              if (name === 'Committed total') yourVal = totalCost
              else if (name === 'Reserve') yourVal = reserve
              else if (name === 'Grand total (Rs 4 crore)') yourVal = 400
              else {
                // Try to match by partial name
                const matched = items.find(item => {
                  if (String(name).includes('COW') && String(name).includes('6') && !String(name).includes('Standby')) return item.name.includes('Cell on wheels') && !item.name.includes('Standby')
                  if (String(name).includes('small')) return item.name.includes('small')
                  if (String(name).includes('M4')) return item.name.includes('M4')
                  if (String(name).includes('M6')) return item.name.includes('M6')
                  if (String(name).includes('S1')) return item.name.includes('S1')
                  if (String(name).includes('S2')) return item.name.includes('S2')
                  if (String(name).includes('Standby')) return item.name.includes('Standby')
                  return false
                })
                yourVal = matched ? matched.unit_cost_lakh * matched.qty : null
              }
              const matches = yourVal !== null && Math.abs(yourVal - Number(target)) < 0.01
              return (
                <tr key={String(name)} className="hover:bg-white/5">
                  <td className="py-1.5 text-gray-300">{name}</td>
                  <td className="py-1.5 text-right font-mono text-white">{Number(target).toFixed(1)}</td>
                  <td className="py-1.5 text-right font-mono">{yourVal !== null ? yourVal.toFixed(1) : '—'}</td>
                  <td className="py-1.5 text-right">
                    {yourVal !== null ? (
                      matches
                        ? <span className="text-green-400">✓</span>
                        : <span className="text-red-400">✗ ({(yourVal - Number(target) > 0 ? '+' : '')}{(yourVal - Number(target)).toFixed(1)})</span>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Simulation warnings */}
      {simResult?.warnings && simResult.warnings.length > 0 && (
        <div className="space-y-2">
          {simResult.warnings.map((w, i) => (
            <Alert key={i} severity="error">{w}</Alert>
          ))}
        </div>
      )}
    </div>
  )
}
