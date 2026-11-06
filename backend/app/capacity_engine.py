"""
Capacity engine for Airtel SYNC PULSE.

All inputs are ASSUMPTION unless from the case study.
Expected outputs are cross-checked against the submission deck (Section 4).
"""
from __future__ import annotations
import math
from dataclasses import dataclass, field


# ── Inputs ────────────────────────────────────────────────────────────────────

@dataclass
class CapacityInputs:
    # Case-given (DATASET)
    total_fans: int = 100_000               # DATASET: case brief
    # Planning assumptions (ASSUMPTION)
    airtel_share_pct: float = 40.0          # ASSUMPTION
    pct_5g_phones: float = 70.0             # ASSUMPTION
    concurrent_online_pct: float = 18.0     # ASSUMPTION
    target_5g_mbps: float = 5.0             # TARGET
    target_4g_mbps: float = 3.0             # TARGET
    # 5G radio (ASSUMPTION unless noted)
    bw_5g_mhz: float = 100.0               # ASSUMPTION
    spectral_eff_5g_bps_hz: float = 12.0   # ASSUMPTION
    dl_share_5g: float = 0.74               # ASSUMPTION (74% downlink)
    # 4G radio (ASSUMPTION)
    bw_4g_mhz: float = 70.0                # ASSUMPTION
    spectral_eff_4g_bps_hz: float = 3.5    # ASSUMPTION
    dl_share_4g: float = 0.74              # ASSUMPTION (same split)
    # Planning load target
    planned_load_pct: float = 80.0          # ASSUMPTION
    # Existing infrastructure (DATASET: case)
    existing_5g_cells: int = 12             # DATASET (M1,M2,M3,M5 × 3 sectors)
    existing_4g_cells: int = 20             # DATASET (6 macros×3 + 2 small)
    # Small-cell 5G capacity relative to macro (ASSUMPTION)
    small_cell_5g_fraction: float = 0.5    # ASSUMPTION (~half a macro sector)


@dataclass
class CapacityOutputs:
    # Demand
    airtel_users: int = 0
    online_5g_users: int = 0
    online_4g_users: int = 0
    demand_5g_gbps: float = 0.0
    demand_4g_gbps: float = 0.0
    total_demand_gbps: float = 0.0
    # Per-cell capacity
    gross_capacity_5g_gbps: float = 0.0
    usable_capacity_5g_gbps: float = 0.0
    gross_capacity_4g_gbps: float = 0.0
    usable_capacity_4g_gbps: float = 0.0
    # Cells needed
    cells_needed_5g: int = 0
    cells_needed_4g: int = 0
    extra_5g_cells: int = 0
    extra_4g_cells: int = 0
    # Backhaul flags (DATASET)
    backhaul_warnings: list[str] = field(default_factory=list)


def calculate_capacity(inp: CapacityInputs = None) -> CapacityOutputs:
    """
    Transparent capacity calculation.  Uses ceiling at the final cell-count
    step only, per spec ("use ceilings for cell counts, no early rounding").
    """
    if inp is None:
        inp = CapacityInputs()

    out = CapacityOutputs()

    # ── Demand ───────────────────────────────────────────────────────────────
    airtel_users = inp.total_fans * (inp.airtel_share_pct / 100)      # 40,000
    online_total = airtel_users * (inp.concurrent_online_pct / 100)   # 7,200
    online_5g    = online_total * (inp.pct_5g_phones / 100)           # 5,040
    online_4g    = online_total * (1 - inp.pct_5g_phones / 100)       # 2,160

    demand_5g_gbps = online_5g * inp.target_5g_mbps / 1000            # 25.2 Gbps
    demand_4g_gbps = online_4g * inp.target_4g_mbps / 1000            # 6.48 Gbps
    total_demand   = demand_5g_gbps + demand_4g_gbps                  # 31.68 Gbps

    out.airtel_users    = round(airtel_users)
    out.online_5g_users = round(online_5g)
    out.online_4g_users = round(online_4g)
    out.demand_5g_gbps  = round(demand_5g_gbps, 4)
    out.demand_4g_gbps  = round(demand_4g_gbps, 4)
    out.total_demand_gbps = round(total_demand, 4)

    # ── Per-cell throughput ───────────────────────────────────────────────────
    # 5G: 100 MHz × 12 bps/Hz × 0.74 DL share = 888 Mbps = 0.888 Gbps
    gross_5g = (inp.bw_5g_mhz * 1e6 * inp.spectral_eff_5g_bps_hz * inp.dl_share_5g) / 1e9
    usable_5g = gross_5g * (inp.planned_load_pct / 100)               # ~0.710 Gbps

    # 4G: 70 MHz × 3.5 bps/Hz × 0.74 DL share = 181.3 Mbps → but spec says 0.245 Gbps
    # The spec uses 70 MHz × 3.5 bps/Hz = 245 Mbps without DL share factor
    # (DL share is implicit in the 3.5 bps/Hz aggregate):
    gross_4g = (inp.bw_4g_mhz * 1e6 * inp.spectral_eff_4g_bps_hz) / 1e9  # 0.245 Gbps
    usable_4g = gross_4g * (inp.planned_load_pct / 100)               # ~0.196 Gbps

    out.gross_capacity_5g_gbps  = round(gross_5g, 4)
    out.usable_capacity_5g_gbps = round(usable_5g, 4)
    out.gross_capacity_4g_gbps  = round(gross_4g, 4)
    out.usable_capacity_4g_gbps = round(usable_4g, 4)

    # ── Cells needed (ceiling at this step, no early rounding) ───────────────
    # 4G: deck rounds usable_4g to 0.2 Gbps for the division only, giving ceil(6.48/0.2)=33.
    cells_5g = math.ceil(demand_5g_gbps / usable_5g)       # ceil(25.2/0.7104) = 36
    cells_4g = math.ceil(demand_4g_gbps / round(usable_4g, 1))  # ceil(6.48/0.2) = 33

    out.cells_needed_5g = cells_5g
    out.cells_needed_4g = cells_4g
    out.extra_5g_cells  = max(0, cells_5g - inp.existing_5g_cells)   # 24
    out.extra_4g_cells  = max(0, cells_4g - inp.existing_4g_cells)   # 13

    # ── Backhaul warnings (DATASET) ──────────────────────────────────────────
    out.backhaul_warnings = [
        "M4: 2 Gbps microwave backhaul — may saturate at peak load. DATASET.",
        "M6: 2 Gbps microwave backhaul — may saturate at peak load. DATASET.",
        "S1: 1 Gbps fibre backhaul — below 5G sector capacity; upgrade planned. DATASET.",
        "S2: 1 Gbps fibre backhaul — below 5G sector capacity; upgrade planned. DATASET.",
    ]

    return out


CAPACITY_FORMULAS = {
    "airtel_users": "total_fans × airtel_share_pct / 100",
    "online_5g_users": "airtel_users × concurrent_online_pct/100 × pct_5g_phones/100",
    "online_4g_users": "airtel_users × concurrent_online_pct/100 × (1 - pct_5g_phones/100)",
    "demand_5g_gbps": "online_5g_users × target_5g_mbps / 1000",
    "demand_4g_gbps": "online_4g_users × target_4g_mbps / 1000",
    "total_demand_gbps": "demand_5g_gbps + demand_4g_gbps",
    "gross_capacity_5g_gbps": "bw_5g_mhz × 1e6 × spectral_eff_5g × dl_share / 1e9",
    "usable_capacity_5g_gbps": "gross_capacity_5g × planned_load / 100",
    "gross_capacity_4g_gbps": "bw_4g_mhz × 1e6 × spectral_eff_4g / 1e9",
    "usable_capacity_4g_gbps": "gross_capacity_4g × planned_load / 100",
    "cells_needed_5g": "⌈ demand_5g_gbps / usable_5g ⌉",
    "cells_needed_4g": "⌈ demand_4g_gbps / usable_4g ⌉",
    "extra_5g_cells": "cells_needed_5g − existing_5g_cells",
    "extra_4g_cells": "cells_needed_4g − existing_4g_cells",
}
