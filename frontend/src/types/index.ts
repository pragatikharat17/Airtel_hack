// Shared TypeScript types for Airtel SYNC PULSE

export type Label = 'DATASET' | 'ASSUMPTION' | 'MODEL' | 'TARGET' | 'SIMULATION'

// ── Sites ──────────────────────────────────────────────────────────────────────
export interface PhaseRow {
  phase: string
  time: string | null
  normal_4g_anchor_load_pct: number | null
  last_4g_anchor_load_pct: number | null
  normal_4g_speed_mbps: number | null
  last_4g_speed_mbps: number | null
  normal_5g_speed_mbps: number | null
  last_5g_speed_mbps: number | null
  last_5g_success_pct: number | null
}

export interface Site {
  site: string
  type: string | null
  distance_m: number | null
  backhaul_type: string | null
  backhaul_capacity_gbps: number | null
  has_5g: string | null
  has_5g_bool: boolean
  is_backhaul_constrained: boolean
  phases: PhaseRow[]
}

// ── Capacity ───────────────────────────────────────────────────────────────────
export interface CapacityOutputs {
  airtel_users: number
  online_5g_users: number
  online_4g_users: number
  demand_5g_gbps: number
  demand_4g_gbps: number
  total_demand_gbps: number
  gross_capacity_5g_gbps: number
  usable_capacity_5g_gbps: number
  gross_capacity_4g_gbps: number
  usable_capacity_4g_gbps: number
  cells_needed_5g: number
  cells_needed_4g: number
  extra_5g_cells: number
  extra_4g_cells: number
  backhaul_warnings: string[]
  formulas: Record<string, string>
  labels: Record<string, Label>
}

// ── Budget ─────────────────────────────────────────────────────────────────────
export interface BudgetItem {
  name: string
  unit_cost_lakh: number
  qty: number
  cost_lakh: number
  note: string
  label: Label
}

export interface BudgetResult {
  items: BudgetItem[]
  committed_lakh: number
  reserve_lakh: number
  total_lakh: number
  over_budget: boolean
  warnings: string[]
  fibre_note: string
}

// ── KPI ────────────────────────────────────────────────────────────────────────
export interface KPI {
  name: string
  value: string | number
  unit: string
  label: Label
  status?: string
}

// ── Overview ───────────────────────────────────────────────────────────────────
export interface OverviewData {
  kpis: KPI[]
  capacity: CapacityOutputs
  budget_summary: { committed_lakh: number; reserve_lakh: number; total_lakh: number; label: string }
  phase_options: string[]
  phase_keys: string[]
  reconciliation: {
    table1_data_rows: number
    table2_data_rows: number
    table3_data_rows: number
    unused_columns_R_T: Array<{ cell: string; value: unknown }>
    sites_no_5g: string[]
    notes: string[]
  }
}

// ── Network history ────────────────────────────────────────────────────────────
export interface NetworkHistory {
  rows: PhaseRow & { site: string }[]
  phases: string[]
  label: string
}

// ── Prediction ─────────────────────────────────────────────────────────────────
export interface RiskAssessment {
  site: string
  phase: string
  anchor_load_pct: number | null
  five_g_success_pct: number | null
  risk_level: string
  risk_colour: string
  success_flag: boolean
  explanation: string
  label: string
  model_fit?: {
    intercept: number
    slope: number
    formula: string
    cv_mae_pct: number
    cv_note: string
    warning: string
    site_predictions: Record<string, { mean_load: number; mean_success: number; predicted_success: number }>
  }
}

export interface SimulatePhaseResponse {
  phase: string
  site_assessments: RiskAssessment[]
  label: string
  disclaimer: string
}

// ── Orchestrator ───────────────────────────────────────────────────────────────
export interface OrchestratorStep {
  step_id: number
  name: string
  status: string
  trigger: string
  action: string
  result: string | null
  label: string
}

export interface OrchestratorResult {
  phase: string
  steps: OrchestratorStep[]
  before_summary: { congested_sites: number; avg_anchor_load_pct: number; label: string }
  after_summary: {
    congested_sites_sim: number
    avg_anchor_load_pct_sim: number
    five_g_success_improvement: string
    upi_failure_target: string
    label: string
  }
  saving_vs_just_add_cells: string
  side_effects: Array<{ effect: string; description: string; mitigation: string; label: string }>
  trigger_rules: Array<{ id: number; condition: string; action: string; label: string }>
  label: string
  disclaimer: string
}

// ── UPI ────────────────────────────────────────────────────────────────────────
export interface UPIRow {
  phase: string
  last_match_upi_failure_pct: number | null
  normal_day_upi_failure_pct: number | null
}

// ── Impact ─────────────────────────────────────────────────────────────────────
export interface ImpactRow {
  metric: string
  last_match: number | null
  target: number | null
  unit: string
  dataset_label: string
  target_label: string
  gap: number | null
  meets_target: boolean | null
  direction: 'lower_is_better' | 'higher_is_better'
}
