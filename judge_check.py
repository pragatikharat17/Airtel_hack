#!/usr/bin/env python3
"""
Judge check script for Airtel SYNC PULSE.

Verifies:
1. All Section 4 capacity numbers match the submission deck
2. All Section 5 budget totals match the submission deck
3. Data loader returns correct row counts
4. API health endpoint responds

Run: python judge_check.py
(requires .venv active and backend running on port 8000 for API check)
"""
import sys
import math

sys.path.insert(0, '.')

print("=" * 60)
print("AIRTEL SYNC PULSE — JUDGE CHECK SCRIPT")
print("=" * 60)

PASS = "✅ PASS"
FAIL = "❌ FAIL"

results = []

def check(name: str, actual, expected, tol=0.01):
    ok = abs(actual - expected) <= tol
    status = PASS if ok else FAIL
    results.append(ok)
    print(f"{status}  {name}")
    if not ok:
        print(f"       Expected: {expected}, Got: {actual}")

# ── Section 4 capacity ────────────────────────────────────────────────────────
print("\n── Section 4: Capacity Numbers ──")
from backend.app.capacity_engine import calculate_capacity
out = calculate_capacity()

check("Airtel users = 40,000",        out.airtel_users,        40000, 0)
check("5G users online = 5,040",      out.online_5g_users,     5040,  0)
check("4G users online = 2,160",      out.online_4g_users,     2160,  0)
check("5G demand = 25.2 Gbps",        out.demand_5g_gbps,      25.2,  0.001)
check("4G demand = 6.48 Gbps",        out.demand_4g_gbps,      6.48,  0.001)
check("Total demand = 31.68 Gbps",    out.total_demand_gbps,   31.68, 0.001)
check("5G gross capacity = 0.888",    out.gross_capacity_5g_gbps, 0.888, 0.001)
check("4G gross capacity = 0.245",    out.gross_capacity_4g_gbps, 0.245, 0.001)
check("5G cells needed = 36",         out.cells_needed_5g,     36, 0)
check("4G cells needed = 33",         out.cells_needed_4g,     33, 0)
check("Extra 5G cells = 24",          out.extra_5g_cells,      24, 0)
check("Extra 4G cells = 13",          out.extra_4g_cells,      13, 0)

# ── Section 5 budget ──────────────────────────────────────────────────────────
print("\n── Section 5: Budget Totals ──")
from backend.app.budget_calculator import calculate_budget, build_default_items
items = build_default_items()
result = calculate_budget(items)

check("Committed total = Rs 336.5 L", result.committed_lakh,  336.5, 0.01)
check("Reserve = Rs 63.5 L",          result.reserve_lakh,    63.5,  0.01)
check("Grand total = Rs 400 L",       result.total_lakh,      400.0, 0.01)
check("Not over budget",              0 if result.over_budget else 1, 1, 0)

# ── Data loader ───────────────────────────────────────────────────────────────
print("\n── Data Loader ──")
from backend.app.data_loader import load_all
t1, t2, t3, recon = load_all()

results.append(len(t1) == 32)
print(f"{'✅' if len(t1)==32 else '❌'} PASS  Table 1: {len(t1)} rows (expected 32)")
results.append(len(t2) == 8)
print(f"{'✅' if len(t2)==8 else '❌'} PASS  Table 2: {len(t2)} rows (expected 8)")
results.append(len(t3) == 4)
print(f"{'✅' if len(t3)==4 else '❌'} PASS  Table 3: {len(t3)} rows (expected 4)")
results.append(len(recon['unused_columns_R_T']) > 0)
print(f"{'✅'} PASS  Unused R:T columns listed: {len(recon['unused_columns_R_T'])} cells")

# UPI values check
upi_expected = [1.84, 7.11, 6.82, 5.23]
for i, (row, expected) in enumerate(zip(t3, upi_expected)):
    actual = row['last_match_upi_failure_pct']
    ok = actual is not None and abs(actual - expected) < 0.01
    results.append(ok)
    print(f"{'✅' if ok else '❌'} PASS  UPI phase {i+1} failure = {actual}% (expected {expected}%)")

# ── API check (optional — requires backend running) ───────────────────────────
print("\n── API Health Check ──")
try:
    import urllib.request
    with urllib.request.urlopen("http://localhost:8000/api/health", timeout=2) as r:
        import json
        data = json.loads(r.read())
        ok = data.get("status") == "ok"
        results.append(ok)
        print(f"{'✅' if ok else '❌'} PASS  API health: {data}")
except Exception as e:
    print(f"⚠️  SKIP  API not running (start backend first): {e}")

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
passed = sum(1 for r in results if r)
total = len(results)
print(f"RESULT: {passed}/{total} checks passed")
if passed == total:
    print("🎉 ALL CHECKS PASSED — submission deck numbers verified.")
else:
    print(f"⚠️  {total - passed} check(s) failed — review output above.")
print("=" * 60)
sys.exit(0 if passed == total else 1)
