"""
FastAPI application — Airtel SYNC PULSE backend.

Endpoints:
  GET  /api/health
  GET  /api/overview
  GET  /api/sites
  GET  /api/network/history
  GET  /api/network/metrics
  GET  /api/budget
  GET  /api/impact
  POST /api/predict/congestion
  POST /api/simulate/match-phase
  POST /api/orchestrator/activate
  POST /api/budget/simulate

CORS is enabled for local development.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .data_loader import (
    get_network_history,
    get_reconciliation,
    get_sites_meta,
    get_upi_data,
    PHASES,
    PHASES_DISPLAY,
    PHASE_TIMES,
    SITES_NO_5G,
)
from .capacity_engine import (
    CapacityInputs,
    calculate_capacity,
    CAPACITY_FORMULAS,
)
from .budget_calculator import (
    BudgetItem,
    calculate_budget,
    build_default_items,
    BUDGET_TARGETS,
)
from .prediction_service import assess_risk, fit_success_model
from .orchestrator_service import run_orchestrator, TRIGGER_RULES, SIDE_EFFECTS
from .crowd_simulator import simulate_crowd
from .failure_cascade import simulate_failure_cascade
from .schemas import (
    BudgetSimulateRequest,
    CongestionPredictRequest,
    OrchestratorActivateRequest,
    SimulateMatchPhaseRequest,
    CapacityInputSchema,
)

app = FastAPI(
    title="Airtel SYNC PULSE API",
    version="1.0.0",
    description="Decision-support prototype for Stadium Network Command Centre. Does NOT control Airtel infrastructure.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _serialise(obj):
    """Convert dataclass / custom objects for JSON."""
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    return str(obj)


def _capacity_to_dict(out) -> dict:
    return {
        "airtel_users": out.airtel_users,
        "online_5g_users": out.online_5g_users,
        "online_4g_users": out.online_4g_users,
        "demand_5g_gbps": out.demand_5g_gbps,
        "demand_4g_gbps": out.demand_4g_gbps,
        "total_demand_gbps": out.total_demand_gbps,
        "gross_capacity_5g_gbps": out.gross_capacity_5g_gbps,
        "usable_capacity_5g_gbps": out.usable_capacity_5g_gbps,
        "gross_capacity_4g_gbps": out.gross_capacity_4g_gbps,
        "usable_capacity_4g_gbps": out.usable_capacity_4g_gbps,
        "cells_needed_5g": out.cells_needed_5g,
        "cells_needed_4g": out.cells_needed_4g,
        "extra_5g_cells": out.extra_5g_cells,
        "extra_4g_cells": out.extra_4g_cells,
        "backhaul_warnings": out.backhaul_warnings,
        "formulas": CAPACITY_FORMULAS,
        "labels": {
            "total_fans": "DATASET",
            "airtel_share_pct": "ASSUMPTION",
            "pct_5g_phones": "ASSUMPTION",
            "concurrent_online_pct": "ASSUMPTION",
            "target_5g_mbps": "TARGET",
            "target_4g_mbps": "TARGET",
            "bw_5g_mhz": "ASSUMPTION",
            "spectral_eff_5g_bps_hz": "ASSUMPTION",
            "bw_4g_mhz": "ASSUMPTION",
            "spectral_eff_4g_bps_hz": "ASSUMPTION",
            "planned_load_pct": "ASSUMPTION",
            "existing_5g_cells": "DATASET",
            "existing_4g_cells": "DATASET",
            "cells_needed_5g": "MODEL",
            "cells_needed_4g": "MODEL",
            "demand_5g_gbps": "MODEL",
            "demand_4g_gbps": "MODEL",
            "total_demand_gbps": "MODEL",
        },
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Airtel SYNC PULSE", "version": "1.0.0"}


@app.get("/api/overview")
def overview():
    cap_out = calculate_capacity()
    budget_res = calculate_budget()
    history = get_network_history()

    kpis = [
        {"name": "Airtel users", "value": cap_out.airtel_users, "unit": "", "label": "MODEL"},
        {"name": "Total demand", "value": f"{cap_out.total_demand_gbps:.2f}", "unit": "Gbps", "label": "MODEL"},
        {"name": "5G cells needed", "value": cap_out.cells_needed_5g, "unit": "", "label": "MODEL"},
        {"name": "4G cells needed", "value": cap_out.cells_needed_4g, "unit": "", "label": "MODEL"},
        {"name": "Extra 5G cells", "value": cap_out.extra_5g_cells, "unit": "", "label": "MODEL"},
        {"name": "Extra 4G cells", "value": cap_out.extra_4g_cells, "unit": "", "label": "MODEL"},
        {"name": "Budget committed", "value": budget_res.committed_lakh, "unit": "Rs L", "label": "ASSUMPTION"},
        {"name": "Budget reserve", "value": budget_res.reserve_lakh, "unit": "Rs L", "label": "ASSUMPTION"},
        {"name": "Match phases", "value": len(PHASES), "unit": "", "label": "DATASET"},
    ]

    return {
        "kpis": kpis,
        "capacity": _capacity_to_dict(cap_out),
        "budget_summary": {
            "committed_lakh": budget_res.committed_lakh,
            "reserve_lakh": budget_res.reserve_lakh,
            "total_lakh": budget_res.total_lakh,
            "label": "ASSUMPTION",
        },
        "phase_options": PHASES_DISPLAY,
        "phase_keys": PHASES,
        "reconciliation": get_reconciliation(),
    }


@app.get("/api/sites")
def sites():
    return {"sites": get_sites_meta(), "label": "DATASET"}


@app.get("/api/network/history")
def network_history():
    return {"rows": get_network_history(), "phases": PHASES, "label": "DATASET"}


@app.get("/api/network/metrics")
def network_metrics():
    history = get_network_history()
    upi = get_upi_data()
    model_fit = fit_success_model(history)
    return {
        "site_phase_data": history,
        "upi_data": upi,
        "model_fit": model_fit,
        "phases": PHASES,
        "sites_no_5g": list(SITES_NO_5G),
        "label": "DATASET",
    }


@app.get("/api/budget")
def budget():
    items = build_default_items()
    result = calculate_budget(items)
    return {
        "items": [i.__dict__ for i in result.items],
        "committed_lakh": result.committed_lakh,
        "reserve_lakh": result.reserve_lakh,
        "total_lakh": result.total_lakh,
        "over_budget": result.over_budget,
        "warnings": result.warnings,
        "fibre_note": result.fibre_note,
        "targets": BUDGET_TARGETS,
        "label": "ASSUMPTION",
    }


@app.get("/api/impact")
def impact():
    """Compare last-match DATASET values against TARGETs."""
    history = get_network_history()
    upi = get_upi_data()

    # Collect last-match peak values across all sites
    loads = [r["last_4g_anchor_load_pct"] for r in history if r["last_4g_anchor_load_pct"] is not None]
    speeds_4g = [r["last_4g_speed_mbps"] for r in history if r["last_4g_speed_mbps"] is not None]
    speeds_5g = [r["last_5g_speed_mbps"] for r in history if r["last_5g_speed_mbps"] is not None]
    success_5g = [r["last_5g_success_pct"] for r in history if r["last_5g_success_pct"] is not None]

    # UPI: last-match peak failure (Innings break or Final over, whichever is higher)
    upi_failures = [u["last_match_upi_failure_pct"] for u in upi if u["last_match_upi_failure_pct"] is not None]

    def safe_max(lst): return max(lst) if lst else None
    def safe_min(lst): return min(lst) if lst else None
    def safe_avg(lst): return round(sum(lst)/len(lst), 2) if lst else None

    rows = [
        {
            "metric": "Peak 4G anchor (B3) load",
            "last_match": safe_max(loads),
            "target": 80.0,
            "unit": "%",
            "dataset_label": "DATASET",
            "target_label": "TARGET",
            "gap": round(safe_max(loads) - 80, 2) if safe_max(loads) is not None else None,
            "meets_target": safe_max(loads) <= 80 if safe_max(loads) is not None else None,
            "direction": "lower_is_better",
        },
        {
            "metric": "Min 4G user speed",
            "last_match": safe_min(speeds_4g),
            "target": 3.0,
            "unit": "Mbps",
            "dataset_label": "DATASET",
            "target_label": "TARGET",
            "gap": round(safe_min(speeds_4g) - 3, 2) if safe_min(speeds_4g) is not None else None,
            "meets_target": safe_min(speeds_4g) >= 3 if safe_min(speeds_4g) is not None else None,
            "direction": "higher_is_better",
        },
        {
            "metric": "Min 5G connection success",
            "last_match": safe_min(success_5g),
            "target": 95.0,
            "unit": "%",
            "dataset_label": "DATASET",
            "target_label": "TARGET",
            "gap": round(safe_min(success_5g) - 95, 2) if safe_min(success_5g) is not None else None,
            "meets_target": safe_min(success_5g) >= 95 if safe_min(success_5g) is not None else None,
            "direction": "higher_is_better",
        },
        {
            "metric": "Min 5G user speed",
            "last_match": safe_min(speeds_5g),
            "target": 5.0,
            "unit": "Mbps",
            "dataset_label": "DATASET",
            "target_label": "TARGET",
            "gap": round(safe_min(speeds_5g) - 5, 2) if safe_min(speeds_5g) is not None else None,
            "meets_target": safe_min(speeds_5g) >= 5 if safe_min(speeds_5g) is not None else None,
            "direction": "higher_is_better",
        },
        {
            "metric": "Peak UPI failure rate",
            "last_match": safe_max(upi_failures),
            "target": 1.5,
            "unit": "%",
            "dataset_label": "DATASET",
            "target_label": "TARGET",
            "gap": round(safe_max(upi_failures) - 1.5, 2) if safe_max(upi_failures) is not None else None,
            "meets_target": safe_max(upi_failures) <= 1.5 if safe_max(upi_failures) is not None else None,
            "direction": "lower_is_better",
        },
    ]

    return {"rows": rows, "label": "DATASET vs TARGET"}


@app.post("/api/predict/congestion")
def predict_congestion(req: CongestionPredictRequest):
    history = get_network_history()
    model_fit = fit_success_model(history)

    # Find matching row
    matches = [
        r for r in history
        if r.get("site") == req.site and r.get("phase") == req.phase
    ]
    if not matches:
        raise HTTPException(404, f"No data for site={req.site}, phase={req.phase}")

    row = matches[0]
    assessment = assess_risk(
        site=req.site,
        phase=req.phase,
        anchor_load_pct=row.get("last_4g_anchor_load_pct"),
        five_g_success_pct=row.get("last_5g_success_pct"),
    )

    return {
        "site": assessment.site,
        "phase": assessment.phase,
        "anchor_load_pct": assessment.anchor_load_pct,
        "five_g_success_pct": assessment.five_g_success_pct,
        "risk_level": assessment.risk_level,
        "risk_colour": assessment.risk_colour,
        "success_flag": assessment.success_flag,
        "explanation": assessment.explanation,
        "label": assessment.label,
        "model_fit": model_fit,
    }


@app.post("/api/simulate/match-phase")
def simulate_match_phase(req: SimulateMatchPhaseRequest):
    history = get_network_history()
    phase_rows = [r for r in history if r.get("phase") == req.phase]
    if not phase_rows:
        raise HTTPException(404, f"Unknown phase: {req.phase}")

    # Risk assessment for each site in this phase
    assessments = []
    for row in phase_rows:
        a = assess_risk(
            site=row["site"],
            phase=row["phase"],
            anchor_load_pct=row.get("last_4g_anchor_load_pct"),
            five_g_success_pct=row.get("last_5g_success_pct"),
        )
        assessments.append({
            "site": a.site,
            "phase": a.phase,
            "anchor_load_pct": a.anchor_load_pct,
            "risk_level": a.risk_level,
            "risk_colour": a.risk_colour,
            "success_flag": a.success_flag,
            "explanation": a.explanation,
            "label": a.label,
        })

    return {
        "phase": req.phase,
        "site_assessments": assessments,
        "label": "MODEL",
        "disclaimer": "This is a software simulation and decision-support prototype. Does NOT control Airtel infrastructure.",
    }


@app.post("/api/orchestrator/activate")
def orchestrator_activate(req: OrchestratorActivateRequest):
    history = get_network_history()
    cap_before = _capacity_to_dict(calculate_capacity())
    result = run_orchestrator(req.phase, history, cap_before)

    return {
        "phase": result.phase,
        "steps": [s.__dict__ for s in result.steps],
        "before_summary": result.before_summary,
        "after_summary": result.after_summary,
        "saving_vs_just_add_cells": result.saving_vs_just_add_cells,
        "side_effects": result.side_effects,
        "trigger_rules": TRIGGER_RULES,
        "label": result.label,
        "disclaimer": result.disclaimer,
    }


@app.post("/api/budget/simulate")
def budget_simulate(req: BudgetSimulateRequest):
    items_in = None
    if req.items:
        items_in = [
            BudgetItem(
                name=i.name,
                unit_cost_lakh=i.unit_cost_lakh,
                qty=i.qty,
                note=i.note,
                label=i.label,
            )
            for i in req.items
        ]
    result = calculate_budget(items_in, over_budget_confirmed=req.over_budget_confirmed)
    return {
        "items": [i.__dict__ for i in result.items],
        "committed_lakh": result.committed_lakh,
        "reserve_lakh": result.reserve_lakh,
        "total_lakh": result.total_lakh,
        "over_budget": result.over_budget,
        "warnings": result.warnings,
        "fibre_note": result.fibre_note,
        "label": "ASSUMPTION",
    }
@app.post("/api/digital-twin/crowd-simulation")
def crowd_simulation(req: Dict[str, Any]):
    crowd_size = int(req.get("crowd_size", 100000))
    phase = req.get("phase", "Innings break")

    airtel_share_pct = float(req.get("airtel_share_pct", 40))
    active_user_pct = float(req.get("active_user_pct", 18))
    avg_traffic_mbps = float(req.get("avg_traffic_mbps", 1.5))

    if crowd_size <= 0:
        raise HTTPException(400, "Crowd size must be greater than zero.")

    sites = get_sites_meta()

    return simulate_crowd(
        sites=sites,
        crowd_size=crowd_size,
        phase=phase,
        airtel_share_pct=airtel_share_pct,
        active_user_pct=active_user_pct,
        avg_traffic_mbps=avg_traffic_mbps,
    )

@app.post("/api/predict/failure-cascade")
def predict_failure_cascade(req: Dict[str, Any]):
    try:
        failed_site = req.get("failed_site", "M5")
        phase = req.get("phase", "Innings break")

        crowd_size = int(req.get("crowd_size", 100000))
        airtel_share_pct = float(req.get("airtel_share_pct", 40))
        active_user_pct = float(req.get("active_user_pct", 18))
        avg_traffic_mbps = float(req.get("avg_traffic_mbps", 1.5))

        sites = get_sites_meta()

        return simulate_failure_cascade(
            sites=sites,
            failed_site=failed_site,
            phase=phase,
            crowd_size=crowd_size,
            airtel_share_pct=airtel_share_pct,
            active_user_pct=active_user_pct,
            avg_traffic_mbps=avg_traffic_mbps,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
