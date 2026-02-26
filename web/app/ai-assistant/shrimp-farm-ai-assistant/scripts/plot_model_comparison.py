"""
Generate model comparison chart: Train vs Validation Accuracy per model.
Output: model_comparison.png, model_comparison.json
"""
import json
import os

import matplotlib.pyplot as plt

# Sample model results (replace with your evaluation results)
models = [
    {"model": "EfficientNetV2B0", "train_acc": 77.72, "val_acc": 73.20},
    {"model": "ConvNeXtTiny", "train_acc": 74.50, "val_acc": 77.47},
    {"model": "EfficientNetV2L", "train_acc": 72.58, "val_acc": 63.47},
    {"model": "ConvNeXtTiny + EfficientNetV2B0", "train_acc": 89.30, "val_acc": 75.30},
    {"model": "Dynamic Attention (Dual-Model)", "train_acc": 93.30, "val_acc": 93.20},
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "output")
os.makedirs(OUT_DIR, exist_ok=True)


def main():
    names = [m["model"] for m in models]
    train_acc = [m["train_acc"] for m in models]
    val_acc = [m["val_acc"] for m in models]

    # Save JSON for frontend
    json_path = os.path.join(OUT_DIR, "model_comparison.json")
    with open(json_path, "w") as f:
        json.dump(models, f, indent=2)
    print(f"Saved {json_path}")

    # Grouped bar chart
    x = range(len(names))
    width = 0.35

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar([i - width / 2 for i in x], train_acc, width, label="Train Accuracy", color="steelblue")
    ax.bar([i + width / 2 for i in x], val_acc, width, label="Validation Accuracy", color="orange")
    ax.set_ylabel("Accuracy (%)")
    ax.set_xlabel("Model")
    ax.set_title("Model comparison: Train vs Validation Accuracy")
    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=45, ha="right")
    ax.legend()
    ax.set_ylim(0, 100)
    plt.tight_layout()
    png_path = os.path.join(OUT_DIR, "model_comparison.png")
    plt.savefig(png_path, dpi=150)
    plt.close()
    print(f"Saved {png_path}")


if __name__ == "__main__":
    main()
