import React from 'react'
import { Activity, BarChart2, Cpu, DollarSign, Radio, Shield, Sliders, Target, Zap } from 'lucide-react'

type Page = 'overview' | 'twin' | 'monitoring' | 'prediction' | 'orchestrator' | 'upi' | 'budget' | 'impact'

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',         icon: <BarChart2 size={16} /> },
  { id: 'twin',         label: 'Digital Twin',      icon: <Radio size={16} /> },
  { id: 'monitoring',   label: 'Monitoring',        icon: <Activity size={16} /> },
  { id: 'prediction',   label: 'Prediction',        icon: <Cpu size={16} /> },
  { id: 'orchestrator', label: 'Orchestrator',      icon: <Sliders size={16} /> },
  { id: 'upi',          label: 'UPI & Emergency',   icon: <Shield size={16} /> },
  { id: 'budget',       label: 'Budget Planner',    icon: <DollarSign size={16} /> },
  { id: 'impact',       label: 'Impact',            icon: <Target size={16} /> },
]

export function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  return (
    <aside className="w-56 shrink-0 bg-airtel-charcoal-mid border-r border-airtel-charcoal-light flex flex-col">
      {/* Logo / brand */}
      <div className="px-4 pt-5 pb-4 border-b border-airtel-charcoal-light">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-airtel-red" />
          <div>
            <div className="text-sm font-bold text-white leading-tight">SYNC PULSE</div>
            <div className="text-[10px] text-airtel-red font-semibold tracking-wider">AIRTEL</div>
          </div>
        </div>
        <p className="text-[9px] text-gray-400 mt-1 leading-tight">Predict. Distribute. Prioritise. Protect.</p>
        <div className="mt-2 text-[8px] text-orange-400 border border-orange-800 bg-orange-950/30 rounded px-1.5 py-0.5">
          PROTOTYPE · DOES NOT CONTROL AIRTEL INFRA
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 text-left
              ${page === item.id
                ? 'bg-airtel-red/20 text-airtel-red-light border-r-2 border-airtel-red font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Case info */}
      <div className="px-4 py-3 border-t border-airtel-charcoal-light text-[9px] text-gray-500 leading-relaxed">
        <div>Stadium Surge · Case 1</div>
        <div>1,00,000 fans · 60 days · Rs 4 cr</div>
        <div>5G cricket final · Airtel</div>
      </div>
    </aside>
  )
}

export type { Page }
