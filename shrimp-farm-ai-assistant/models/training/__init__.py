"""
Training utilities for the decision model.

Heavy imports (e.g. PyTorch in ``trainer``) are lazy so scripts like
``train_harvest_ml_models.py`` can import ``harvest_ml_features`` without torch installed.
"""

from typing import Any

__all__ = [
    "DecisionModelTrainer",
    "train_decision_model",
    "TrainingDataGenerator",
]


def __getattr__(name: str) -> Any:
    if name in ("DecisionModelTrainer", "train_decision_model"):
        from models.training.trainer import DecisionModelTrainer as _DMT, train_decision_model as _tdm

        if name == "DecisionModelTrainer":
            return _DMT
        return _tdm
    if name == "TrainingDataGenerator":
        from models.training.data_generator import TrainingDataGenerator as _TDG

        return _TDG
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
