"""
Data loader for Sync_V1.xlsx.

Parses three tables by position (header row 2):
- Table 1: A2:J34  — 32 rows, 8 sites × 4 phases, load/speed/success
- Table 2: L2:Q10  — 8 site-level metadata rows
- Table 3: L13:N17 — UPI failure rates (4 phases × 2 conditions)

Columns R:T are present but unused; they are listed in the reconciliation report.

No values are invented.  Blank cells stay None.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import openpyxl

XLSX_PATH = Path(__file__).parent.parent.parent / "dataset" / "Sync_V1.xlsx"

PHASES = [
    "Crowd building up",
    "Innings break",
    "Final over",
    "Post-match",
]

# Display names with times for the UI
PHASES_DISPLAY = [
    "Crowd building up (17:00)",
    "Innings break (21:00)",
    "Final over (22:45)",
    "Post-match (23:15)",
]

PHASE_TIMES = {
    "Crowd building up": "17:00",
    "Innings break": "21:00",
    "Final over": "22:45",
    "Post-match": "23:15",
}


SITES_NO_5G = {"M4", "M6", "S1", "S2"}


def _cell(ws, row: int, col: int) -> Any:
    """Return cell value; None for blank."""
    return ws.cell(row=row, column=col).value


def load_workbook() -> openpyxl.Workbook:
    if not XLSX_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {XLSX_PATH}")
    return openpyxl.load_workbook(str(XLSX_PATH), data_only=True)


def load_all():
    """Return (table1_rows, table2_rows, table3_rows, reconciliation)."""
    wb = load_workbook()
    ws = wb["Sheet1"]

    # ── Table 1: A2:J34  (rows 2–34, cols 1–10) ─────────────────────────────
    # Header row is row 2.  Data rows are 3–34  (32 data rows = 8 sites × 4 phases).
    table1 = []
    for r in range(3, 35):  # rows 3..34  (Python range is exclusive at end)
        site = _cell(ws, r, 1)
        phase = _cell(ws, r, 2)
        time_ = _cell(ws, r, 3)
        normal_4g_load = _cell(ws, r, 4)
        last_4g_load = _cell(ws, r, 5)
        normal_4g_speed = _cell(ws, r, 6)
        last_4g_speed = _cell(ws, r, 7)
        normal_5g_speed = _cell(ws, r, 8)
        last_5g_speed = _cell(ws, r, 9)
        last_5g_success = _cell(ws, r, 10)

        # For sites without 5G, 5G speed columns should be blank.
        # We keep them as None (no invention).
        table1.append(
            {
                "site": site,
                "phase": phase,
                "time": str(time_) if time_ is not None else None,
                "normal_4g_anchor_load_pct": normal_4g_load,
                "last_4g_anchor_load_pct": last_4g_load,
                "normal_4g_speed_mbps": normal_4g_speed,
                "last_4g_speed_mbps": last_4g_speed,
                "normal_5g_speed_mbps": normal_5g_speed,
                "last_5g_speed_mbps": last_5g_speed,
                "last_5g_success_pct": last_5g_success,
            }
        )

    # ── Table 2: L2:Q10  (rows 2–10, cols 12–17) ─────────────────────────────
    # Header row 2, data rows 3–10 (8 sites).
    table2 = []
    for r in range(3, 11):
        site = _cell(ws, r, 12)
        site_type = _cell(ws, r, 13)
        distance_m = _cell(ws, r, 14)
        backhaul_type = _cell(ws, r, 15)
        backhaul_cap_gbps = _cell(ws, r, 16)
        has_5g = _cell(ws, r, 17)
        table2.append(
            {
                "site": site,
                "type": site_type,
                "distance_m": distance_m,
                "backhaul_type": backhaul_type,
                "backhaul_capacity_gbps": backhaul_cap_gbps,
                "has_5g": has_5g,
            }
        )

    # ── Table 3: L13:N17  (rows 13–17, cols 12–14) ───────────────────────────
    # Row 13 = header.  Rows 14–17 = four phases.
    # Columns: phase label (L), last-match UPI failure % (M), normal-day UPI failure % (N).
    table3 = []
    for r in range(14, 18):
        phase_label = _cell(ws, r, 12)
        last_upi = _cell(ws, r, 13)
        normal_upi = _cell(ws, r, 14)
        table3.append(
            {
                "phase": phase_label,
                "last_match_upi_failure_pct": last_upi,
                "normal_day_upi_failure_pct": normal_upi,
            }
        )

    # ── Unused columns R:T ────────────────────────────────────────────────────
    unused_rt: list[dict] = []
    for r in range(2, 12):
        for c in range(18, 21):  # R=18, S=19, T=20
            v = _cell(ws, r, c)
            if v is not None:
                col_letter = chr(ord("A") + c - 1)
                unused_rt.append({"cell": f"{col_letter}{r}", "value": v})

    reconciliation = {
        "table1_data_rows": len(table1),
        "table2_data_rows": len(table2),
        "table3_data_rows": len(table3),
        "unused_columns_R_T": unused_rt,
        "sites_no_5g": list(SITES_NO_5G),
        "notes": [
            "Columns R:T in the spreadsheet are unlabelled and ignored per the build spec.",
            "Sites M4, M6, S1, S2 have no 5G cells; their 5G speed columns are blank in the dataset.",
            "5G connection success for M4/M6/S1/S2 is labelled "
            "'5G attach success for users served by this anchor'.",
            "There is no 5G load % in the dataset; any 5G utilisation shown is a MODEL value.",
        ],
    }

    return table1, table2, table3, reconciliation


# ── Convenience aggregations used by the API ─────────────────────────────────

def get_sites_meta() -> list[dict]:
    """Return Table 2 enriched with Table 1 aggregates."""
    t1, t2, t3, _ = load_all()

    # Build a lookup: site → list of phase rows
    by_site: dict[str, list[dict]] = {}
    for row in t1:
        by_site.setdefault(row["site"], []).append(row)

    result = []
    for s in t2:
        site_id = s["site"]
        phases = by_site.get(site_id, [])
        s_out = dict(s)
        s_out["phases"] = phases
        s_out["has_5g_bool"] = site_id not in SITES_NO_5G
        s_out["is_backhaul_constrained"] = (
            s["backhaul_capacity_gbps"] is not None
            and s["backhaul_capacity_gbps"] <= 2
        )
        result.append(s_out)
    return result


def get_network_history() -> list[dict]:
    """Return Table 1 rows as-is for time-series charts."""
    t1, _, _, _ = load_all()
    return t1


def get_upi_data() -> list[dict]:
    """Return Table 3 rows."""
    _, _, t3, _ = load_all()
    return t3


def get_reconciliation() -> dict:
    _, _, _, recon = load_all()
    return recon
