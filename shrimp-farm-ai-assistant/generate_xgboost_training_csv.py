#!/usr/bin/env python3
"""
CLI wrapper: generate synthetic CSV for XGBoost training.

Run from shrimp-farm-ai-assistant directory (same as train_xgboost_models.py):

  python generate_xgboost_training_csv.py --samples 20000

Then train from the file:

  python train_xgboost_models.py --from-csv models/training/synthetic_xgboost_training.csv
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on path when run as script
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from models.training.generate_synthetic_csv import generate_synthetic_csv, _parse_args


if __name__ == "__main__":
    args = _parse_args()
    path = generate_synthetic_csv(
        output_path=args.output,
        num_samples=args.samples,
        seed=args.seed,
    )
    print(f"Wrote {args.samples} rows to {path}")
