"""
Pydantic schemas for all API request / response bodies.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Shared ─────────────────────────────────────────────────────────────────────

class LabelledValue(BaseModel):
    value: Any
    label: str  # DATASET | ASSUMPTION | MODEL | TARGET | SIMULATION


# ── Sites ──────────────────────────────────────────────────────────────────────

class PhaseRow(BaseModel):
    phase: str
    time: Optional[str]
    normal_4g_anchor_load_pct: Optional[float]
    last_4g_anchor_load_pct: Optional[float]
    normal_4g_speed_mbps: Optional[float]
    last_4g_speed_mbps: Optional[float]
    normal_5g_speed_mbps: Optional[float]
    last_5g_speed_mbps: Optional[float]
    last_5g_success_pct: Optional[float]


class SiteSchema(BaseModel):
    site: str
    type: Optional[str]
    distance_m: Optional[float]
    backhaul_type: Optional[str]
    backhaul_capacity_gbps: Optional[float]
    has_5g: Optional[Any]
    has_5g_bool: bool
    is_backhaul_constrained: bool
    phases: List[Dict[str, Any]]


# ── Capacity ───────────────────────────────────────────────────────────────────

class CapacityInputSchema(BaseModel):
    total_fans: int = Field(100000, ge=1)
    airtel_share_pct: float = Field(40.0, ge=0, le=100)
    pct_5g_phones: float = Field(70.0, ge=0, le=100)
    concurrent_online_pct: float = Field(18.0, ge=0, le=100)
    target_5g_mbps: float = Field(5.0, ge=0)
    target_4g_mbps: float = Field(3.0, ge=0)
    bw_5g_mhz: float = Field(100.0, ge=0)
    spectral_eff_5g_bps_hz: float = Field(12.0, ge=0)
    dl_share_5g: float = Field(0.74, ge=0, le=1)
    bw_4g_mhz: float = Field(70.0, ge=0)
    spectral_eff_4g_bps_hz: float = Field(3.5, ge=0)
    planned_load_pct: float = Field(80.0, ge=0, le=100)
    existing_5g_cells: int = Field(12, ge=0)
    existing_4g_cells: int = Field(20, ge=0)


class CapacityOutputSchema(BaseModel):
    airtel_users: int
    online_5g_users: int
    online_4g_users: int
    demand_5g_gbps: float
    demand_4g_gbps: float
    total_demand_gbps: float
    gross_capacity_5g_gbps: float
    usable_capacity_5g_gbps: float
    gross_capacity_4g_gbps: float
    usable_capacity_4g_gbps: float
    cells_needed_5g: int
    cells_needed_4g: int
    extra_5g_cells: int
    extra_4g_cells: int
    backhaul_warnings: List[str]
    formulas: Dict[str, str]


# ── Budget ─────────────────────────────────────────────────────────────────────

class BudgetItemSchema(BaseModel):
    name: str
    unit_cost_lakh: float
    qty: int
    cost_lakh: float
    note: str = ""
    label: str = "ASSUMPTION"


class BudgetSimulateRequest(BaseModel):
    items: Optional[List[BudgetItemSchema]] = None
    over_budget_confirmed: bool = False


class BudgetResultSchema(BaseModel):
    items: List[BudgetItemSchema]
    committed_lakh: float
    reserve_lakh: float
    total_lakh: float
    over_budget: bool
    warnings: List[str]
    fibre_note: str


# ── Prediction ─────────────────────────────────────────────────────────────────

class CongestionPredictRequest(BaseModel):
    site: str
    phase: str


class CongestionPredictResponse(BaseModel):
    site: str
    phase: str
    anchor_load_pct: Optional[float]
    five_g_success_pct: Optional[float]
    risk_level: str
    risk_colour: str
    success_flag: bool
    explanation: str
    label: str
    model_fit: Optional[Dict[str, Any]] = None


# ── Orchestrator ───────────────────────────────────────────────────────────────

class SimulateMatchPhaseRequest(BaseModel):
    phase: str


class OrchestratorActivateRequest(BaseModel):
    phase: str = "Innings break (21:00)"


class OrchestratorStepSchema(BaseModel):
    step_id: int
    name: str
    status: str
    trigger: str
    action: str
    result: Optional[str]
    label: str


class OrchestratorResultSchema(BaseModel):
    phase: str
    steps: List[OrchestratorStepSchema]
    before_summary: Dict[str, Any]
    after_summary: Dict[str, Any]
    saving_vs_just_add_cells: str
    side_effects: List[Dict[str, Any]]
    label: str
    disclaimer: str


# ── Overview / Impact ──────────────────────────────────────────────────────────

class KPISchema(BaseModel):
    name: str
    value: Any
    unit: str
    label: str
    status: Optional[str] = None  # "ok" | "warning" | "critical"


class OverviewSchema(BaseModel):
    kpis: List[KPISchema]
    capacity: CapacityOutputSchema
    budget_summary: Dict[str, Any]
    phase_options: List[str]


class ImpactRowSchema(BaseModel):
    metric: str
    last_match: Optional[float]
    target: Optional[float]
    unit: str
    dataset_label: str
    target_label: str
    gap: Optional[float]
    meets_target: Optional[bool]
