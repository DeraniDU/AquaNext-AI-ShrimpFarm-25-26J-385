"""
Training Script for Decision Model
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
import numpy as np
from pathlib import Path
import json
from typing import Dict, Tuple

from models.decision_model import DecisionMakingModel
from models.training.data_generator import TrainingDataGenerator


class DecisionDataset(Dataset):
    """Dataset for decision model training"""
    
    def __init__(self, features: np.ndarray, labels: Dict[str, np.ndarray]):
        self.features = torch.tensor(features, dtype=torch.float32)
        self.labels = {
            'action_type': torch.tensor(labels['action_type'], dtype=torch.long),
            'action_intensity': torch.tensor(labels['action_intensity'], dtype=torch.float32),
            'priority': torch.tensor(labels['priority'], dtype=torch.float32),
            'urgency': torch.tensor(labels['urgency'], dtype=torch.float32),
            'feed_amount': torch.tensor(labels['feed_amount'], dtype=torch.float32),
            'equipment_schedule': torch.tensor(labels['equipment_schedule'], dtype=torch.float32)
        }
    
    def __len__(self):
        return len(self.features)
    
    def __getitem__(self, idx):
        return {
            'features': self.features[idx],
            'labels': {k: v[idx] for k, v in self.labels.items()}
        }


class DecisionModelTrainer:
    """Trainer for the decision model"""
    
    def __init__(self, model: DecisionMakingModel, device='cpu'):
        self.model = model
        self.device = device
        self.model.to(device)
        
        # Loss functions
        self.action_type_loss = nn.CrossEntropyLoss()
        self.action_intensity_loss = nn.MSELoss()
        self.priority_loss = nn.MSELoss()
        self.urgency_loss = nn.MSELoss()
        self.feed_amount_loss = nn.MSELoss()
        self.equipment_schedule_loss = nn.MSELoss()
        
        # Optimizer
        self.optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.5, patience=10, verbose=True
        )
        
        # Training history
        self.history = {
            'train_loss': [],
            'val_loss': [],
            'action_type_acc': [],
            'urgency_mae': []
        }
    
    def train_epoch(self, train_loader: DataLoader) -> Dict[str, float]:
        """Train for one epoch"""
        self.model.train()
        total_loss = 0.0
        action_correct = 0
        action_total = 0
        
        for batch in train_loader:
            features = batch['features'].to(self.device)
            labels = {k: v.to(self.device) for k, v in batch['labels'].items()}
            
            # Forward pass
            outputs = self.model(features)
            
            # Calculate losses
            action_type_loss = self.action_type_loss(outputs['action_type'], labels['action_type'])
            action_intensity_loss = self.action_intensity_loss(
                outputs['action_intensity'], labels['action_intensity']
            )
            priority_loss = self.priority_loss(outputs['priority'], labels['priority'])
            urgency_loss = self.urgency_loss(outputs['urgency'], labels['urgency'].unsqueeze(1))
            feed_amount_loss = self.feed_amount_loss(
                outputs['feed_amount'], labels['feed_amount'].unsqueeze(1)
            )
            equipment_schedule_loss = self.equipment_schedule_loss(
                outputs['equipment_schedule'], labels['equipment_schedule']
            )
            
            # Combined loss (weighted)
            loss = (
                action_type_loss * 2.0 +
                action_intensity_loss * 1.0 +
                priority_loss * 1.5 +
                urgency_loss * 1.5 +
                feed_amount_loss * 1.0 +
                equipment_schedule_loss * 1.0
            )
            
            # Backward pass
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()
            
            total_loss += loss.item()
            
            # Calculate accuracy
            pred_actions = torch.argmax(outputs['action_type'], dim=1)
            action_correct += (pred_actions == labels['action_type']).sum().item()
            action_total += labels['action_type'].size(0)
        
        avg_loss = total_loss / len(train_loader)
        action_acc = action_correct / action_total if action_total > 0 else 0.0
        
        return {
            'loss': avg_loss,
            'action_accuracy': action_acc
        }
    
    def validate(self, val_loader: DataLoader) -> Dict[str, float]:
        """Validate the model"""
        self.model.eval()
        total_loss = 0.0
        action_correct = 0
        action_total = 0
        urgency_errors = []
        
        with torch.no_grad():
            for batch in val_loader:
                features = batch['features'].to(self.device)
                labels = {k: v.to(self.device) for k, v in batch['labels'].items()}
                
                outputs = self.model(features)
                
                # Calculate losses
                action_type_loss = self.action_type_loss(outputs['action_type'], labels['action_type'])
                action_intensity_loss = self.action_intensity_loss(
                    outputs['action_intensity'], labels['action_intensity']
                )
                priority_loss = self.priority_loss(outputs['priority'], labels['priority'])
                urgency_loss = self.urgency_loss(outputs['urgency'], labels['urgency'].unsqueeze(1))
                feed_amount_loss = self.feed_amount_loss(
                    outputs['feed_amount'], labels['feed_amount'].unsqueeze(1)
                )
                equipment_schedule_loss = self.equipment_schedule_loss(
                    outputs['equipment_schedule'], labels['equipment_schedule']
                )
                
                loss = (
                    action_type_loss * 2.0 +
                    action_intensity_loss * 1.0 +
                    priority_loss * 1.5 +
                    urgency_loss * 1.5 +
                    feed_amount_loss * 1.0 +
                    equipment_schedule_loss * 1.0
                )
                
                total_loss += loss.item()
                
                pred_actions = torch.argmax(outputs['action_type'], dim=1)
                action_correct += (pred_actions == labels['action_type']).sum().item()
                action_total += labels['action_type'].size(0)
                
                urgency_errors.extend(
                    torch.abs(outputs['urgency'] - labels['urgency'].unsqueeze(1)).cpu().numpy()
                )
        
        avg_loss = total_loss / len(val_loader)
        action_acc = action_correct / action_total if action_total > 0 else 0.0
        urgency_mae = np.mean(urgency_errors) if urgency_errors else 0.0
        
        return {
            'loss': avg_loss,
            'action_accuracy': action_acc,
            'urgency_mae': urgency_mae
        }
    
    def train(self, train_loader: DataLoader, val_loader: DataLoader, 
              epochs: int = 100, save_path: str = 'models/decision_model.pth'):
        """Train the model"""
        best_val_loss = float('inf')
        patience_counter = 0
        max_patience = 20
        
        print(f"Starting training for {epochs} epochs...")
        print(f"Device: {self.device}")
        print(f"Train batches: {len(train_loader)}, Val batches: {len(val_loader)}")
        
        for epoch in range(epochs):
            # Train
            train_metrics = self.train_epoch(train_loader)
            
            # Validate
            val_metrics = self.validate(val_loader)
            
            # Update learning rate
            self.scheduler.step(val_metrics['loss'])
            
            # Save history
            self.history['train_loss'].append(train_metrics['loss'])
            self.history['val_loss'].append(val_metrics['loss'])
            self.history['action_type_acc'].append(val_metrics['action_accuracy'])
            self.history['urgency_mae'].append(val_metrics['urgency_mae'])
            
            # Print progress
            if (epoch + 1) % 10 == 0 or epoch == 0:
                print(f"\nEpoch {epoch+1}/{epochs}")
                print(f"  Train Loss: {train_metrics['loss']:.4f}, "
                      f"Action Acc: {train_metrics['action_accuracy']:.4f}")
                print(f"  Val Loss: {val_metrics['loss']:.4f}, "
                      f"Action Acc: {val_metrics['action_accuracy']:.4f}, "
                      f"Urgency MAE: {val_metrics['urgency_mae']:.4f}")
            
            # Save best model
            if val_metrics['loss'] < best_val_loss:
                best_val_loss = val_metrics['loss']
                patience_counter = 0
                Path(save_path).parent.mkdir(parents=True, exist_ok=True)
                self.model.save_model(save_path)
                print(f"  ✓ Saved best model (val_loss: {best_val_loss:.4f})")
            else:
                patience_counter += 1
            
            # Early stopping
            if patience_counter >= max_patience:
                print(f"\nEarly stopping at epoch {epoch+1}")
                break
        
        print(f"\nTraining completed! Best validation loss: {best_val_loss:.4f}")
        return self.history


def train_decision_model(num_samples: int = 10000, epochs: int = 100, 
                        batch_size: int = 32, device: str = 'cpu'):
    """Main training function"""
    
    print("=" * 60)
    print("Decision Model Training")
    print("=" * 60)
    
    # Generate training data
    print("\n1. Generating training data...")
    generator = TrainingDataGenerator()
    features, labels = generator.generate_dataset(
        num_samples=num_samples,
        scenarios=["normal", "good", "poor", "critical"]
    )
    print(f"   Generated {len(features)} samples")
    print(f"   Feature shape: {features.shape}")
    
    # Create dataset
    print("\n2. Creating dataset...")
    dataset = DecisionDataset(features, labels)
    
    # Split train/val
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    print(f"   Train samples: {train_size}, Val samples: {val_size}")
    
    # Create model
    print("\n3. Creating model...")
    model = DecisionMakingModel(input_size=features.shape[1])
    print(f"   Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Create trainer
    print("\n4. Starting training...")
    trainer = DecisionModelTrainer(model, device=device)
    
    # Train
    history = trainer.train(
        train_loader, 
        val_loader, 
        epochs=epochs,
        save_path='models/decision_model.pth'
    )
    
    # Save training history
    history_path = 'models/training_history.json'
    Path(history_path).parent.mkdir(parents=True, exist_ok=True)
    with open(history_path, 'w') as f:
        json.dump({k: [float(x) for x in v] for k, v in history.items()}, f, indent=2)
    print(f"\n5. Training history saved to {history_path}")
    
    return model, history


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Decision Model')
    parser.add_argument('--samples', type=int, default=10000, help='Number of training samples')
    parser.add_argument('--epochs', type=int, default=100, help='Number of epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--device', type=str, default='cpu', help='Device (cpu/cuda)')
    
    args = parser.parse_args()
    
    train_decision_model(
        num_samples=args.samples,
        epochs=args.epochs,
        batch_size=args.batch_size,
        device=args.device
    )

