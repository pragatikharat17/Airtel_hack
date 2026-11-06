"""
Prediction and risk-scoring service.

Uses a transparent rule-based risk score (Section 3).
No black-box ML — the dataset has only 32 rows.

Also fits a simple linear model of 5G connection success vs anchor load,
evaluated with leave-one-site-out cross-validation.  Error is shown to the user.
All outputs are labelled MODEL or DATASET.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional


# ── Risk score rules ──────────────────────────────────────────────────────────

RISK_THRESHOLDS = {
    "Low":      (0,  60),    # anchor load < 60%
    "Moderate": (60, 80),    # 60% ≤ load < 80%
    "High":     (80, 95),    # 80% ≤ load < 95%
    "Critical": (95, 100),   # load ≥ 95%
}

RISK_COLOURS = {
    "Low":      "#22c55e",  # green
    "Moderate": "#eab308",  # yellow
    "High":     "#f97316",  # orange
    "Critical": "#ef4444",  # red
}

SUCCESS_FLAG_THRESHOLD = 90.0  # flag when 5G success < 90%


@dataclass
class RiskAssessment:
    site: str
    phase: str
    anchor_load_pct: Optional[float]
    five_g_success_pct: Optional[float]
    risk_level: str
    risk_colour: str
    success_flag: bool
    explanation: str
    label: str = "MODEL"  # rule-based score is a model output


def assess_risk(site: str, phase: str, anchor_load_pct: Optional[float],
                five_g_success_pct: Optional[float]) -> RiskAssessment:
    """Apply transparent threshold rules to produce a risk level."""
    if anchor_load_pct is None:
        risk_level = "Unknown"
        colour = "#6b7280"
        explanation = "No anchor load data available for this site/phase. DATASET: no data."
    else:
        load = anchor_load_pct
        if load < 60:
            risk_level = "Low"
        elif load < 80:
            risk_level = "Moderate"
        elif load < 95:
            risk_level = "High"
        else:
            risk_level = "Critical"
        colour = RISK_COLOURS.get(risk_level, "#6b7280")
        explanation = (
            f"4G anchor (B3) load is {load:.1f}% (DATASET). "
            f"Rule: load {'<' if load < 60 else '≥'} "
            f"{RISK_THRESHOLDS.get(risk_level, (0,0))[0]}% → {risk_level} risk. "
            "In NSA 5G, a congested LTE anchor blocks 5G connections even if 5G "
            "spectrum is available, because the 5G secondary cell depends on the "
            "LTE anchor for control-plane signalling."
        )

    success_flag = False
    if five_g_success_pct is not None and five_g_success_pct < SUCCESS_FLAG_THRESHOLD:
        success_flag = True
        explanation += (
            f" ⚠ 5G connection success is {five_g_success_pct:.1f}% (DATASET), "
            f"below the {SUCCESS_FLAG_THRESHOLD:.0f}% alert threshold."
        )

    return RiskAssessment(
        site=site,
        phase=phase,
        anchor_load_pct=anchor_load_pct,
        five_g_success_pct=five_g_success_pct,
        risk_level=risk_level if anchor_load_pct is not None else "Unknown",
        risk_colour=colour,
        success_flag=success_flag,
        explanation=explanation,
    )


# ── Simple linear fit: 5G success ~ anchor load ───────────────────────────────

def fit_success_model(data_rows: list[dict]) -> dict:
    """
    Fit 5G_success_pct = a + b × anchor_load using leave-one-site-out CV.
    Returns slope, intercept, CV MAE, and predictions per site.
    Label: MODEL — not a measurement, not machine learning.
    """
    # Collect per-site averages (success, load) for sites that have both values.
    from collections import defaultdict
    site_data: dict[str, list[tuple[float, float]]] = defaultdict(list)

    for row in data_rows:
        load = row.get("last_4g_anchor_load_pct")
        succ = row.get("last_5g_success_pct")
        site = row.get("site")
        if load is not None and succ is not None:
            site_data[site].append((load, succ))

    if len(site_data) < 2:
        return {"error": "Insufficient data for model fitting. MODEL."}

    # Average per site for leave-one-site-out
    sites = list(site_data.keys())
    xs = [sum(p[0] for p in site_data[s]) / len(site_data[s]) for s in sites]
    ys = [sum(p[1] for p in site_data[s]) / len(site_data[s]) for s in sites]
    n = len(sites)

    def ols(x_list, y_list):
        """Ordinary least squares: returns (slope, intercept)."""
        mx = sum(x_list) / len(x_list)
        my = sum(y_list) / len(y_list)
        num = sum((xi - mx) * (yi - my) for xi, yi in zip(x_list, y_list))
        den = sum((xi - mx) ** 2 for xi in x_list)
        if abs(den) < 1e-9:
            return 0.0, my
        b = num / den
        a = my - b * mx
        return b, a

    # Leave-one-site-out CV
    errors = []
    for i in range(n):
        train_x = [xs[j] for j in range(n) if j != i]
        train_y = [ys[j] for j in range(n) if j != i]
        b, a = ols(train_x, train_y)
        pred = a + b * xs[i]
        errors.append(abs(pred - ys[i]))

    cv_mae = sum(errors) / len(errors)

    # Final fit on all sites
    b_final, a_final = ols(xs, ys)

    predictions = {
        sites[i]: {
            "mean_load": round(xs[i], 2),
            "mean_success": round(ys[i], 2),
            "predicted_success": round(a_final + b_final * xs[i], 2),
        }
        for i in range(n)
    }

    return {
        "intercept": round(a_final, 4),
        "slope": round(b_final, 4),
        "formula": "5G_success_pct = intercept + slope × anchor_load_pct",
        "cv_method": "Leave-one-site-out cross-validation",
        "cv_mae_pct": round(cv_mae, 2),
        "cv_note": (
            f"Mean absolute error across {n} left-out sites = {cv_mae:.2f} percentage points. "
            "With only 8 sites this error estimate has very high variance. "
            "Do not over-interpret this model. Label: MODEL."
        ),
        "site_predictions": predictions,
        "label": "MODEL",
        "warning": (
            "Dataset has 32 rows (8 sites × 4 phases). "
            "No black-box ML (RF, XGBoost) is used because it would overfit. "
            "This is a simple linear fit for transparency only."
        ),
    }
