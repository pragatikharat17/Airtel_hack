import React from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

type Severity = 'info' | 'warning' | 'error' | 'success'

const STYLES: Record<Severity, string> = {
  info:    'bg-blue-950/40 border-blue-700 text-blue-300',
  warning: 'bg-amber-950/40 border-amber-700 text-amber-300',
  error:   'bg-red-950/40 border-red-700 text-red-300',
  success: 'bg-green-950/40 border-green-700 text-green-300',
}

const ICONS: Record<Severity, React.ReactNode> = {
  info:    <Info size={14} />,
  warning: <AlertTriangle size={14} />,
  error:   <XCircle size={14} />,
  success: <CheckCircle size={14} />,
}

export function Alert({ severity = 'info', children }: { severity?: Severity; children: React.ReactNode }) {
  return (
    <div className={`border rounded px-3 py-2 text-xs flex items-start gap-2 ${STYLES[severity]}`}>
      <span className="mt-0.5 shrink-0">{ICONS[severity]}</span>
      <span>{children}</span>
    </div>
  )
}
