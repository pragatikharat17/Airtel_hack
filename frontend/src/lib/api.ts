// API client for Airtel SYNC PULSE
// All requests go to FastAPI backend via Vite proxy.

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  health:            () => get<{ status: string }>('/health'),
  overview:          () => get<import('../types').OverviewData>('/overview'),
  sites:             () => get<{ sites: import('../types').Site[] }>('/sites'),
  networkHistory:    () => get<import('../types').NetworkHistory>('/network/history'),
  networkMetrics:    () => get<{ site_phase_data: import('../types').PhaseRow[]; upi_data: import('../types').UPIRow[]; model_fit: unknown; phases: string[]; sites_no_5g: string[] }>('/network/metrics'),
  budget:            () => get<import('../types').BudgetResult & { targets: Record<string, number> }>('/budget'),
  impact:            () => get<{ rows: import('../types').ImpactRow[] }>('/impact'),

  predictCongestion: (site: string, phase: string) =>
    post<import('../types').RiskAssessment>('/predict/congestion', { site, phase }),

  simulatePhase: (phase: string) =>
    post<import('../types').SimulatePhaseResponse>('/simulate/match-phase', { phase }),

  activateOrchestrator: (phase: string) =>
    post<import('../types').OrchestratorResult>('/orchestrator/activate', { phase }),

  simulateBudget: (items: import('../types').BudgetItem[], over_budget_confirmed = false) =>
    post<import('../types').BudgetResult>('/budget/simulate', { items, over_budget_confirmed }),
}
