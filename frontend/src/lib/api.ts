
// API client for Airtel SYNC PULSE
// All requests go to FastAPI backend via Vite proxy.

const BASE = '/api'

export interface FailureCascadeResult {
  failed_site: string
  phase: string
  crowd_size: number
  airtel_users_estimated: number
  active_users_estimated: number
  total_demand_gbps: number
  original_traffic_per_site_gbps: number
  redistributed_traffic_per_site_gbps: number
  additional_traffic_per_site_gbps: number
  failed_site_traffic_gbps: number
  critical_sites: number
  high_risk_sites: number
  sites: {
    site: string
    status: string
    baseline_radio_load_pct: number | null
    traffic_after_gbps: number
    additional_traffic_gbps: number
    backhaul_capacity_gbps: number | null
    estimated_backhaul_demand_pct: number | null
    radio_risk: string
    backhaul_risk: string
    overall_risk: string
    explanation: string
  }[]
  recommendations: string[]
  assumptions: string[]
  label: string
}

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
  health: () => get<{ status: string }>('/health'),

  overview: () => get<import('../types').OverviewData>('/overview'),

  sites: () => get<{ sites: import('../types').Site[] }>('/sites'),

  networkHistory: () => get<import('../types').NetworkHistory>('/network/history'),

  networkMetrics: () =>
    get<{
      site_phase_data: import('../types').PhaseRow[]
      upi_data: import('../types').UPIRow[]
      model_fit: unknown
      phases: string[]
      sites_no_5g: string[]
    }>('/network/metrics'),

  budget: () =>
    get<import('../types').BudgetResult & { targets: Record<string, number> }>('/budget'),

  impact: () => get<{ rows: import('../types').ImpactRow[] }>('/impact'),

  predictCongestion: (site: string, phase: string) =>
    post<import('../types').RiskAssessment>(
      '/predict/congestion',
      { site, phase }
    ),

  simulatePhase: (phase: string) =>
    post<import('../types').SimulatePhaseResponse>(
      '/simulate/match-phase',
      { phase }
    ),

  activateOrchestrator: (phase: string) =>
    post<import('../types').OrchestratorResult>(
      '/orchestrator/activate',
      { phase }
    ),

  crowdSimulation: (
    crowd_size: number,
    phase: string,
    airtel_share_pct = 40,
    active_user_pct = 18,
    avg_traffic_mbps = 1.5
  ) =>
    post<import('../types').CrowdSimulationResult>(
      '/digital-twin/crowd-simulation',
      {
        crowd_size,
        phase,
        airtel_share_pct,
        active_user_pct,
        avg_traffic_mbps,
      }
    ),

  failureCascade: (
    failed_site: string,
    phase: string,
    crowd_size = 100000,
    airtel_share_pct = 40,
    active_user_pct = 18,
    avg_traffic_mbps = 1.5
  ) =>
    post<FailureCascadeResult>(
      '/predict/failure-cascade',
      {
        failed_site,
        phase,
        crowd_size,
        airtel_share_pct,
        active_user_pct,
        avg_traffic_mbps,
      }
    ),

  simulateBudget: (
    items: import('../types').BudgetItem[],
    over_budget_confirmed = false
  ) =>
    post<import('../types').BudgetResult>(
      '/budget/simulate',
      { items, over_budget_confirmed }
    ),
}
