import React from 'react'

export function PhaseSelector({
  phases,
  selected,
  onChange,
}: {
  phases: string[]
  selected: string
  onChange: (p: string) => void
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {phases.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors duration-100
            ${selected === p
              ? 'bg-airtel-red text-white'
              : 'bg-airtel-charcoal-light text-gray-300 hover:bg-airtel-charcoal-light/80'
            }`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
