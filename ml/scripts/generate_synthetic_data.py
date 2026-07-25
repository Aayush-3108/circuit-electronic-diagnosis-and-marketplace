"""
Generate a synthetic tabular dataset for the Circuit decision engine.

This produces device records combining:
  - device metadata (type, brand tier, age, original price)
  - condition signals (the kind of thing the YOLOv8 CV model would output:
    damage_type, damage_severity, functional_status)
  - two regression targets: estimated_repair_cost, estimated_resale_value
  - one classification target: recommendation (sell / repair / recycle / upgrade)

The labeling logic is RULE-BASED (not random), which matters for a capstone
viva -- you should be able to explain exactly why each row got its label,
not just point at a black box. The rules encode real second-hand-electronics
market logic (India-context INR pricing):

  - recycle: device is old + severely damaged + repair cost exceeds resale value
             by a wide margin (not economically worth fixing)
  - repair:  damage exists but repair cost is a small fraction of resale value
             (fixing it recovers meaningfully more value than it costs)
  - sell:    device is in good/working condition (sell as-is, no repair needed)
  - upgrade: device is old (out of warranty era, low resale value) even if
             undamaged -- nudges the user toward the upgrade advisor flow

A controlled amount of label noise is added (~4%) to mimic real-world
ambiguity and prevent the downstream classifier from overfitting to a
perfectly separable synthetic rule set.

Usage:
    pip install pandas numpy
    python generate_synthetic_data.py --n 8000 --out ../../data/synthetic_devices.csv
"""

import argparse
import numpy as np
import pandas as pd

RNG_SEED = 42

DEVICE_TYPES = {
    # type: (min_price, max_price, avg_lifespan_months, depreciation_rate_per_month)
    "phone":   (8000, 150000, 36, 0.028),
    "laptop":  (25000, 250000, 60, 0.018),
    "tablet":  (10000, 90000, 48, 0.020),
    "pc":      (30000, 200000, 72, 0.012),
    "monitor": (6000, 60000, 84, 0.010),
}

BRAND_TIER = ["budget", "mid", "premium"]
BRAND_TIER_MULTIPLIER = {"budget": 0.7, "mid": 1.0, "premium": 1.5}

DAMAGE_TYPES = [
    "none", "screen_crack", "screen_scratch", "dead_pixel",
    "body_damage", "keyboard_damage", "battery_issue", "port_damage",
]
# how expensive each damage type typically is to fix, as a fraction of original price
DAMAGE_COST_FRACTION = {
    "none": 0.0,
    "screen_scratch": 0.03,
    "dead_pixel": 0.10,
    "port_damage": 0.05,
    "battery_issue": 0.08,
    "keyboard_damage": 0.06,
    "body_damage": 0.12,
    "screen_crack": 0.22,
}

FUNCTIONAL_STATUS = ["fully_functional", "partially_functional", "not_functional"]


def sample_devices(n: int, rng: np.random.Generator) -> pd.DataFrame:
    device_type = rng.choice(list(DEVICE_TYPES.keys()), size=n, p=[0.35, 0.25, 0.15, 0.15, 0.10])
    brand_tier = rng.choice(BRAND_TIER, size=n, p=[0.4, 0.4, 0.2])

    rows = []
    for i in range(n):
        dtype = device_type[i]
        tier = brand_tier[i]
        min_p, max_p, lifespan, dep_rate = DEVICE_TYPES[dtype]

        original_price = round(rng.uniform(min_p, max_p) * BRAND_TIER_MULTIPLIER[tier], -2)
        age_months = int(rng.gamma(shape=2.0, scale=lifespan / 2.5))
        age_months = min(age_months, lifespan * 2)  # cap absurd outliers

        # damage: skew toward "none" and light damage; heavier damage rarer
        damage_type = rng.choice(
            DAMAGE_TYPES,
            p=[0.30, 0.18, 0.14, 0.08, 0.10, 0.06, 0.08, 0.06],
        )
        damage_severity = 0.0 if damage_type == "none" else round(float(rng.uniform(0.15, 1.0)), 2)

        if damage_type == "none":
            functional_status = "fully_functional"
        else:
            functional_status = rng.choice(
                FUNCTIONAL_STATUS,
                p=[0.5, 0.35, 0.15] if damage_severity < 0.6 else [0.15, 0.45, 0.40],
            )

        battery_health_pct = int(np.clip(rng.normal(100 - age_months * 0.9, 8), 15, 100))

        rows.append(
            dict(
                device_id=f"DEV{i:06d}",
                device_type=dtype,
                brand_tier=tier,
                original_price_inr=original_price,
                age_months=age_months,
                battery_health_pct=battery_health_pct,
                damage_type=damage_type,
                damage_severity=damage_severity,
                functional_status=functional_status,
                depreciation_rate=dep_rate,
            )
        )
    return pd.DataFrame(rows)


def compute_targets(df: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    df = df.copy()

    # --- estimated resale value (regression target 1) ---
    # depreciate original price by age, apply a further condition penalty
    age_depreciation = (1 - df["depreciation_rate"]) ** df["age_months"]
    base_resale = df["original_price_inr"] * age_depreciation

    condition_penalty = 1 - (df["damage_severity"] * 0.5)  # damage reduces resale value
    battery_penalty = 0.7 + 0.3 * (df["battery_health_pct"] / 100)  # weak battery reduces value
    noise = rng.normal(1.0, 0.05, size=len(df))

    resale_value = (base_resale * condition_penalty * battery_penalty * noise).clip(lower=300)
    df["estimated_resale_value_inr"] = resale_value.round(-1)

    # --- estimated repair cost (regression target 2) ---
    cost_fraction = df["damage_type"].map(DAMAGE_COST_FRACTION)
    repair_noise = rng.normal(1.0, 0.15, size=len(df))
    repair_cost = df["original_price_inr"] * cost_fraction * (0.5 + df["damage_severity"]) * repair_noise
    df["estimated_repair_cost_inr"] = repair_cost.clip(lower=0).round(-1)

    # --- recommendation label (classification target) ---
    def decide(row):
        resale = row["estimated_resale_value_inr"]
        repair = row["estimated_repair_cost_inr"]
        age = row["age_months"]
        lifespan = DEVICE_TYPES[row["device_type"]][2]
        functional = row["functional_status"]

        if functional == "not_functional" and repair > resale * 0.8:
            return "recycle"
        if row["damage_type"] == "none":
            if age > lifespan * 0.9:
                return "upgrade"
            return "sell"
        if repair <= resale * 0.35 and functional != "not_functional":
            return "repair"
        if repair > resale * 0.8 or age > lifespan * 1.3:
            return "recycle"
        if age > lifespan * 0.9:
            return "upgrade"
        return "sell"

    df["recommendation"] = df.apply(decide, axis=1)

    # inject ~4% label noise for realism
    noise_mask = rng.random(len(df)) < 0.04
    alt_labels = rng.choice(["sell", "repair", "recycle", "upgrade"], size=noise_mask.sum())
    df.loc[noise_mask, "recommendation"] = alt_labels

    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=8000, help="number of synthetic rows")
    parser.add_argument("--out", type=str, default="../../data/synthetic_devices.csv")
    parser.add_argument("--seed", type=int, default=RNG_SEED)
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    df = sample_devices(args.n, rng)
    df = compute_targets(df, rng)
    df = df.drop(columns=["depreciation_rate"])

    df.to_csv(args.out, index=False)
    print(f"Wrote {len(df)} rows to {args.out}")
    print("\nLabel distribution:")
    print(df["recommendation"].value_counts(normalize=True).round(3))
    print("\nSample rows:")
    print(df.sample(5, random_state=1).to_string(index=False))


if __name__ == "__main__":
    main()
