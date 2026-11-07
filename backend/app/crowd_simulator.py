"""
Crowd-to-Network Digital Twin
Estimates additional network load from stadium crowd size.

Baseline site loads come from the existing dataset.
Crowd behaviour and traffic distribution are simulation assumptions.
"""

from typing import Any


def get_risk(value):
    if value is None:
        return "UNKNOWN"
    if value >= 95:
        return "CRITICAL"
    if value >= 80:
        return "HIGH"
    if value >= 60:
        return "MODERATE"
    return "LOW"


def simulate_crowd(
    sites,
    crowd_size,
    phase,
    airtel_share_pct=40.0,
    active_user_pct=18.0,
    avg_traffic_mbps=1.5,
):
    if crowd_size <= 0:
        raise ValueError("Crowd size must be greater than zero.")

    if not sites:
        raise ValueError("No site data available.")

    if not 0 <= airtel_share_pct <= 100:
        raise ValueError("Airtel share must be between 0 and 100.")

    if not 0 <= active_user_pct <= 100 or avg_traffic_mbps < 0:
        raise ValueError("Invalid traffic assumptions.")

    airtel_users = crowd_size * airtel_share_pct / 100
    active_users = airtel_users * active_user_pct / 100

    total_demand_gbps = active_users * avg_traffic_mbps / 1000

    # SIMULATION ASSUMPTION: equal traffic distribution.
    traffic_per_site_gbps = total_demand_gbps / len(sites)

    results = []

    for site in sites:
        phase_data = next(
            (
                p for p in site.get("phases", [])
                if p.get("phase") == phase
            ),
            None,
        )

        baseline_radio_load = (
            phase_data.get("last_4g_anchor_load_pct")
            if phase_data else None
        )

        backhaul_capacity = site.get("backhaul_capacity_gbps")

        if backhaul_capacity and backhaul_capacity > 0:
            added_backhaul_utilization = (
                traffic_per_site_gbps / backhaul_capacity
            ) * 100
        else:
            added_backhaul_utilization = None

        radio_risk = get_risk(baseline_radio_load)
        backhaul_risk = get_risk(added_backhaul_utilization)

        risk_order = {
            "UNKNOWN": 0,
            "LOW": 1,
            "MODERATE": 2,
            "HIGH": 3,
            "CRITICAL": 4,
        }

        overall_risk = max(
            [radio_risk, backhaul_risk],
            key=lambda risk: risk_order[risk],
        )

        results.append({
            "site": site.get("site"),
            "baseline_radio_load_pct": baseline_radio_load,
            "added_backhaul_utilization_pct": (
                round(added_backhaul_utilization, 2)
                if added_backhaul_utilization is not None
                else None
            ),
            "traffic_gbps": round(traffic_per_site_gbps, 4),
            "backhaul_capacity_gbps": backhaul_capacity,
            "radio_risk": radio_risk,
            "backhaul_risk": backhaul_risk,
            "overall_risk": overall_risk,
        })

    return {
        "crowd_size": crowd_size,
        "airtel_users_estimated": round(airtel_users),
        "active_users_estimated": round(active_users),
        "total_demand_gbps": round(total_demand_gbps, 3),
        "traffic_per_site_gbps": round(traffic_per_site_gbps, 4),
        "phase": phase,
        "sites": results,
        "label": "SIMULATION",
        "assumptions": [
            f"Airtel market share: {airtel_share_pct}%",
            f"Active data users: {active_user_pct}%",
            f"Average traffic per active user: {avg_traffic_mbps} Mbps",
            "Traffic distributed equally across available sites.",
            "Radio load is taken from the existing dataset.",
            "Backhaul utilization is estimated from additional traffic.",
            "Baseline backhaul utilization is not available.",
            "This is a simulation, not a live network measurement.",
        ],
    }