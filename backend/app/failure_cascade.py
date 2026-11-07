
"""
Intelligent Network Failure Cascade Simulation.

Uses dataset radio loads and backhaul capacities.
Traffic redistribution is an illustrative equal-sharing assumption,
not actual Airtel network routing or topology.
"""

from typing import Any


def get_risk(value: float) -> str:
    if value >= 95:
        return "CRITICAL"
    elif value >= 80:
        return "HIGH"
    elif value >= 60:
        return "MODERATE"
    return "LOW"


def simulate_failure_cascade(
    sites: list[dict[str, Any]],
    failed_site: str,
    phase: str = "Innings break",
    crowd_size: int = 100000,
    airtel_share_pct: float = 40,
    active_user_pct: float = 18,
    avg_traffic_mbps: float = 1.5,
) -> dict[str, Any]:

    # Validate inputs
    if crowd_size <= 0:
        raise ValueError("Crowd size must be greater than zero.")

    if not 0 <= airtel_share_pct <= 100:
        raise ValueError("Airtel share must be between 0 and 100.")

    if not 0 <= active_user_pct <= 100:
        raise ValueError("Active user percentage must be between 0 and 100.")

    if avg_traffic_mbps < 0:
        raise ValueError("Average traffic cannot be negative.")

    site_ids = [s["site"] for s in sites]

    if failed_site not in site_ids:
        raise ValueError(f"Unknown site: {failed_site}")

    available_sites = [
        s for s in sites if s["site"] != failed_site
    ]

    if not available_sites:
        raise ValueError("No sites available for traffic redistribution.")

    # Estimate total Airtel network demand
    airtel_users = round(crowd_size * airtel_share_pct / 100)

    active_users = round(airtel_users * active_user_pct / 100)

    total_demand_gbps = (
        active_users * avg_traffic_mbps / 1000
    )

    # Assume traffic was initially distributed equally
    original_site_count = len(sites)

    original_traffic_per_site = (
        total_demand_gbps / original_site_count
    )

    # After failure, redistribute the entire demand equally
    # among the remaining sites.
    traffic_per_available_site = (
        total_demand_gbps / len(available_sites)
    )

    additional_traffic_per_site = (
        traffic_per_available_site - original_traffic_per_site
    )

    results = []

    for site in sites:

        site_id = site["site"]

        # Find the selected phase's dataset row
        phase_data = next(
            (
                p for p in site.get("phases", [])
                if p.get("phase") == phase
            ),
            None
        )

        if phase_data is None:
            raise ValueError(
                f"Phase '{phase}' not found for site {site_id}"
            )

        radio_load = phase_data.get(
            "last_4g_anchor_load_pct"
        )

        capacity = site.get("backhaul_capacity_gbps")

        # Failed site
        if site_id == failed_site:
            results.append({
                "site": site_id,
                "status": "FAILED",
                "baseline_radio_load_pct": radio_load,
                "traffic_after_gbps": 0,
                "additional_traffic_gbps": 0,
                "backhaul_capacity_gbps": capacity,
                "estimated_backhaul_demand_pct": None,
                "radio_risk": "UNAVAILABLE",
                "backhaul_risk": "UNAVAILABLE",
                "overall_risk": "UNAVAILABLE",
                "explanation": "This site is unavailable in the simulated failure."
            })
            continue

        # Remaining sites receive redistributed traffic
        if capacity is not None and capacity > 0:
            backhaul_demand_pct = (
                traffic_per_available_site / capacity
            ) * 100
        else:
            backhaul_demand_pct = None

        radio_risk = (
            get_risk(radio_load)
            if radio_load is not None
            else "UNKNOWN"
        )

        backhaul_risk = (
            get_risk(backhaul_demand_pct)
            if backhaul_demand_pct is not None
            else "UNKNOWN"
        )

        risk_order = {
            "LOW": 1,
            "MODERATE": 2,
            "HIGH": 3,
            "CRITICAL": 4,
            "UNKNOWN": 0,
        }

        overall_risk = max(
            [radio_risk, backhaul_risk],
            key=lambda r: risk_order.get(r, 0)
        )

        results.append({
            "site": site_id,
            "status": "ACTIVE",
            "baseline_radio_load_pct": radio_load,
            "traffic_after_gbps": round(
                traffic_per_available_site, 3
            ),
            "additional_traffic_gbps": round(
                additional_traffic_per_site, 3
            ),
            "backhaul_capacity_gbps": capacity,
            "estimated_backhaul_demand_pct": (
                round(backhaul_demand_pct, 1)
                if backhaul_demand_pct is not None
                else None
            ),
            "radio_risk": radio_risk,
            "backhaul_risk": backhaul_risk,
            "overall_risk": overall_risk,
            "explanation": (
                f"Receives redistributed traffic after "
                f"{failed_site} failure. "
                f"Estimated traffic demand: "
                f"{traffic_per_available_site:.3f} Gbps."
            )
        })

    # Count affected sites
    active_results = [
        s for s in results if s["status"] == "ACTIVE"
    ]

    critical_count = sum(
        1 for s in active_results
        if s["overall_risk"] == "CRITICAL"
    )

    high_count = sum(
        1 for s in active_results
        if s["overall_risk"] == "HIGH"
    )

    recommendations = []

    if critical_count > 0:
        recommendations.append(
            "Prioritise capacity relief at critical-risk sites."
        )

    if high_count > 0:
        recommendations.append(
            "Monitor high-risk sites and consider load balancing."
        )

    recommendations.append(
        "Check alternative backhaul capacity before rerouting traffic."
    )

    recommendations.append(
        "Validate the simulated redistribution against actual "
        "network topology before operational use."
    )

    return {
        "failed_site": failed_site,
        "phase": phase,
        "crowd_size": crowd_size,
        "airtel_users_estimated": airtel_users,
        "active_users_estimated": active_users,
        "total_demand_gbps": round(total_demand_gbps, 3),
        "original_traffic_per_site_gbps": round(
            original_traffic_per_site, 3
        ),
        "redistributed_traffic_per_site_gbps": round(
            traffic_per_available_site, 3
        ),
        "additional_traffic_per_site_gbps": round(
            additional_traffic_per_site, 3
        ),
        "failed_site_traffic_gbps": round(
            original_traffic_per_site, 3
        ),
        "critical_sites": critical_count,
        "high_risk_sites": high_count,
        "sites": results,
        "recommendations": recommendations,
        "assumptions": [
            "Traffic is initially distributed equally across all sites.",
            "After failure, traffic is distributed equally across remaining sites.",
            "Radio load is taken from the selected phase in the dataset.",
            "Backhaul demand is estimated traffic divided by backhaul capacity.",
            "Baseline backhaul utilization is unavailable.",
            "Actual site-to-site connectivity and routing are not provided.",
            "This is a scenario simulation, not a live network prediction."
        ],
        "label": "SIMULATION"
    }
