#!/usr/bin/env python3
"""
Training Script for Decision Model

Usage:
    python train_decision_model.py --samples 10000 --epochs 100 --batch-size 32
"""

from models.training.trainer import train_decision_model

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Decision Model for Shrimp Farm')
    parser.add_argument('--samples', type=int, default=10000, 
                       help='Number of training samples to generate (default: 10000)')
    parser.add_argument('--epochs', type=int, default=100, 
                       help='Number of training epochs (default: 100)')
    parser.add_argument('--batch-size', type=int, default=32, 
                       help='Batch size for training (default: 32)')
    parser.add_argument('--device', type=str, default='cpu', 
                       choices=['cpu', 'cuda'], 
                       help='Device to use for training (default: cpu)')
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("Shrimp Farm Decision Model Training")
    print("=" * 70)
    print(f"\nConfiguration:")
    print(f"  Training samples: {args.samples}")
    print(f"  Epochs: {args.epochs}")
    print(f"  Batch size: {args.batch_size}")
    print(f"  Device: {args.device}")
    print()
    
    train_decision_model(
        num_samples=args.samples,
        epochs=args.epochs,
        batch_size=args.batch_size,
        device=args.device
    )

