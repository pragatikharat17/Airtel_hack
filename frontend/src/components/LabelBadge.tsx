// Label badge component — every number must carry a label per the spec.
import React from 'react'
import type { Label } from '../types'

const CLASS: Record<Label, string> = {
  DATASET:    'label-dataset',
  ASSUMPTION: 'label-assumption',
  MODEL:      'label-model',
  TARGET:     'label-target',
  SIMULATION: 'label-simulation',
}

export function LabelBadge({ label }: { label: string }) {
  const cls = CLASS[label as Label] ?? 'label-badge bg-gray-700 text-gray-300'
  return <span className={cls}>{label}</span>
}

export function ValueWithLabel({
  value,
  unit = '',
  label,
  className = '',
}: {
  value: string | number | null | undefined
  unit?: string
  label: string
  className?: string
}) {
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <span className="font-semibold">
        {value === null || value === undefined ? (
          <span className="text-gray-500 italic text-xs">no data</span>
        ) : (
          <>{value}{unit && <span className="text-gray-400 text-sm ml-0.5">{unit}</span>}</>
        )}
      </span>
      <LabelBadge label={label} />
    </span>
  )
}

export function NoData() {
  return <span className="text-gray-500 italic text-xs">no data</span>
}
