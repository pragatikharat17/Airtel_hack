"""
Budget calculator for Airtel SYNC PULSE.
All costs in Rs lakh.  Matches Section 5 of the submission deck exactly.

Fibre cost note: fibre length uses distance from the stadium centre as a proxy
because the case study gives no distance from the site to a fibre breakout point.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


BUDGET_HARD_CAP_LAKH = 400.0  # Rs 4 crore = 400 lakh


@dataclass
class BudgetItem:
    name: str
    unit_cost_lakh: float
    qty: int
    cost_lakh: float = 0.0           # calculated
    note: str = ""
    label: str = "ASSUMPTION"       # for display

    def recalculate(self):
        self.cost_lakh = round(self.unit_cost_lakh * self.qty, 2)


@dataclass
class BudgetResult:
    items: List[BudgetItem] = field(default_factory=list)
    committed_lakh: float = 0.0
    reserve_lakh: float = 0.0
    total_lakh: float = 0.0
    over_budget: bool = False
    warnings: List[str] = field(default_factory=list)
    fibre_note: str = (
        "Fibre lengths (0.38 km for M4, 0.45 km for M6) use distance from the "
        "stadium centre as a proxy; the case study provides no distance from each "
        "site to a fibre breakout point."
    )


def build_default_items() -> List[BudgetItem]:
    """Return the canonical Section 5 budget items with default quantities."""
    items = [
        BudgetItem(
            name="Cell on wheels (3-sector, 4G+5G)",
            unit_cost_lakh=25.0,
            qty=6,
            note="Rs 25 L each",
            label="ASSUMPTION",
        ),
        BudgetItem(
            name="In-bowl small cells",
            unit_cost_lakh=8.0,
            qty=10,
            note="Rs 8 L each",
            label="ASSUMPTION",
        ),
        BudgetItem(
            name="5G add-on at M4 (Rs 8 L) + fibre 0.38 km @ Rs 50 L/km",
            unit_cost_lakh=8.0 + 0.38 * 50,
            qty=1,
            note="8 + 19 = 27 L; fibre length = distance from stadium centre (ASSUMPTION)",
            label="ASSUMPTION",
        ),
        BudgetItem(
            name="5G add-on at M6 (Rs 8 L) + fibre 0.45 km @ Rs 50 L/km",
            unit_cost_lakh=8.0 + 0.45 * 50,
            qty=1,
            note="8 + 22.5 = 30.5 L; fibre length = distance from stadium centre (ASSUMPTION)",
            label="ASSUMPTION",
        ),
        BudgetItem(
            name="5G add-on at S1 (Rs 8 L) + 1G→10G backhaul uplift (Rs 4 L)",
            unit_cost_lakh=12.0,
            qty=1,
            note="8 + 4 = 12 L (ASSUMPTION)",
            label="ASSUMPTION",
        ),
        BudgetItem(
            name="5G add-on at S2 (Rs 8 L) + 1G→10G backhaul uplift (Rs 4 L)",
            unit_cost_lakh=12.0,
            qty=1,
            note="8 + 4 = 12 L (ASSUMPTION)",
            label="ASSUMPTION",
        ),
        BudgetItem(
            name="Standby COW",
            unit_cost_lakh=25.0,
            qty=1,
            note="Rs 25 L",
            label="ASSUMPTION",
        ),
    ]
    for item in items:
        item.recalculate()
    return items


def calculate_budget(items: List[BudgetItem] = None, over_budget_confirmed: bool = False) -> BudgetResult:
    if items is None:
        items = build_default_items()
    else:
        for item in items:
            item.recalculate()

    committed = round(sum(i.cost_lakh for i in items), 2)
    total_budget = 400.0  # Rs 4 crore = 400 lakh
    reserve = round(total_budget - committed, 2)
    over = committed > BUDGET_HARD_CAP_LAKH

    warnings = []
    if over and not over_budget_confirmed:
        warnings.append(
            f"TOTAL Rs {committed} L EXCEEDS Rs 400 L HARD CAP. "
            "Confirm 'over_budget_confirmed=true' to proceed."
        )

    return BudgetResult(
        items=items,
        committed_lakh=committed,
        reserve_lakh=reserve,
        total_lakh=total_budget,
        over_budget=over,
        warnings=warnings,
    )


BUDGET_TARGETS = {
    "cows_6": 150.0,
    "small_cells_10": 80.0,
    "m4_5g_fibre": 27.0,
    "m6_5g_fibre": 30.5,
    "s1_5g_uplift": 12.0,
    "s2_5g_uplift": 12.0,
    "standby_cow": 25.0,
    "committed_total": 336.5,
    "reserve": 63.5,
    "grand_total": 400.0,
}
