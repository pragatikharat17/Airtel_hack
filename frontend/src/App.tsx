import React, { useState, useEffect, useRef } from 'react'
import { Sidebar, type Page } from './components/Sidebar'
import { OverviewPage }     from './pages/OverviewPage'
import { DigitalTwinPage }  from './pages/DigitalTwinPage'
import { MonitoringPage }   from './pages/MonitoringPage'
import { PredictionPage }   from './pages/PredictionPage'
import { OrchestratorPage } from './pages/OrchestratorPage'
import { UPIPage }          from './pages/UPIPage'
import { BudgetPage }       from './pages/BudgetPage'
import { ImpactPage }       from './pages/ImpactPage'
import { Play, Square, Zap } from 'lucide-react'

// Demo story: 90-second walkthrough of the innings-break surge scenario
const DEMO_STEPS: { page: Page; delay: number; narration: string }[] = [
  { page: 'overview',     delay: 0,    narration: '📊 Overview: Stadium Surge — 1,00,000 fans, Rs 4 crore budget, 36 5G cells needed.' },
  { page: 'twin',         delay: 8000, narration: '📡 Digital Twin: Innings break — M1, M2, M3 at critical load. M6 has spare capacity.' },
  { page: 'monitoring',   delay: 18000, narration: '📈 Monitoring: Anchor loads spike at 21:00. 5G success collapses at high-load sites.' },
  { page: 'prediction',   delay: 30000, narration: '🔴 Prediction: M1, M2, M3 → CRITICAL at Innings break. 5G success flagged < 90%.' },
  { page: 'orchestrator', delay: 42000, narration: '⚡ Orchestrator: SYNC PULSE activated — load balance → COWs → EN-DC tuning → QoS.' },
  { page: 'upi',          delay: 60000, narration: '💳 UPI: 7.11% failure at peak. Priority QoS applied. Network caveat shown.' },
  { page: 'budget',       delay: 72000, narration: '💰 Budget: Rs 336.5 L committed, Rs 63.5 L reserve. Adjust quantities to explore.' },
  { page: 'impact',       delay: 82000, narration: '🎯 Impact: Last match vs targets. 5G success gap identified. Plan closes it.' },
]

export default function App() {
  const [page, setPage]       = useState<Page>('overview')
  const [demoRunning, setDemoRunning] = useState(false)
  const [demoNarration, setDemoNarration] = useState('')
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const startDemo = () => {
    setDemoRunning(true)
    demoTimers.current.forEach(clearTimeout)
    demoTimers.current = []

    DEMO_STEPS.forEach(({ page: p, delay, narration }) => {
      const t = setTimeout(() => {
        setPage(p)
        setDemoNarration(narration)
      }, delay)
      demoTimers.current.push(t)
    })

    const endTimer = setTimeout(() => {
      setDemoRunning(false)
      setDemoNarration('✅ Demo complete. Reset to explore manually.')
    }, 90000)
    demoTimers.current.push(endTimer)
  }

  const stopDemo = () => {
    demoTimers.current.forEach(clearTimeout)
    setDemoRunning(false)
    setDemoNarration('')
  }

  useEffect(() => () => demoTimers.current.forEach(clearTimeout), [])

  const PAGE_COMPONENTS: Record<Page, React.ReactNode> = {
    overview:     <OverviewPage />,
    twin:         <DigitalTwinPage />,
    monitoring:   <MonitoringPage />,
    prediction:   <PredictionPage />,
    orchestrator: <OrchestratorPage />,
    upi:          <UPIPage />,
    budget:       <BudgetPage />,
    impact:       <ImpactPage />,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-airtel-charcoal">
      <Sidebar page={page} setPage={p => { stopDemo(); setPage(p) }} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-10 shrink-0 bg-airtel-charcoal-mid border-b border-airtel-charcoal-light
                           flex items-center justify-between px-4">
          <div className="text-xs text-gray-400">
            Airtel SYNC PULSE — Stadium Network Command Centre
            <span className="ml-3 text-orange-400 font-semibold">PROTOTYPE · DOES NOT CONTROL AIRTEL INFRASTRUCTURE</span>
          </div>
          <div className="flex items-center gap-2">
            {demoNarration && (
              <span className="text-xs text-amber-300 max-w-96 truncate">{demoNarration}</span>
            )}
            {demoRunning ? (
              <button onClick={stopDemo}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">
                <Square size={11} /> Reset Demo
              </button>
            ) : (
              <button onClick={startDemo}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-airtel-red hover:bg-airtel-red-dark text-white">
                <Play size={11} /> Demo (~90s)
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {PAGE_COMPONENTS[page]}
        </main>
      </div>
    </div>
  )
}
