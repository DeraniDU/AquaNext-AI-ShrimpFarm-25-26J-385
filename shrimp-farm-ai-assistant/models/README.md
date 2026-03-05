# Decision Model for Shrimp Farm Management

This directory contains the decision-making model that analyzes farm data and makes operational decisions.

## Overview

The decision model is a neural network that:
- Takes input from water quality, feed, energy, and labor data
- Makes decisions about actions to take (aeration, water exchange, feed adjustment, etc.)
- Prioritizes ponds that need attention
- Provides optimization recommendations

## Architecture

- **Input**: 35 features extracted from farm data
- **Architecture**: Multi-layer neural network with batch normalization and dropout
- **Outputs**: 
  - Action type and intensity
  - Priority rankings
  - Urgency scores
  - Feed amounts
  - Equipment schedules

## Files

- `decision_model.py`: Core model architecture
- `decision_outputs.py`: Output data models
- `decision_integration.py`: Integration with existing agents
- `training/data_generator.py`: Training data generation
- `training/trainer.py`: Training utilities

## Usage

### Training the Model

```bash
# Basic training
python train_decision_model.py

# With custom parameters
python train_decision_model.py --samples 20000 --epochs 150 --batch-size 64
```

### Using the Model

```python
from models.decision_integration import DecisionAgent
from models import WaterQualityData, FeedData, EnergyData, LaborData

# Create agent
agent = DecisionAgent(model_path='models/decision_model.pth')

# Make decision
decision = agent.make_decision(
    water_quality_data=[...],
    feed_data=[...],
    energy_data=[...],
    labor_data=[...],
    pond_id=1
)

print(f"Action: {decision.primary_action}")
print(f"Urgency: {decision.urgency_score}")
print(f"Reasoning: {decision.reasoning}")
```

See `example_use_decision_model.py` for a complete example.

## Model Outputs

### DecisionOutput
- `primary_action`: Main action to take
- `action_intensity`: How strongly to apply the action (0-1)
- `urgency_score`: How urgent the situation is (0-1)
- `priority_rank`: Priority ranking among ponds
- `recommended_feed_amount`: Optimal feed amount
- `recommended_aerator_level`: Aerator setting (0-1)
- `recommended_pump_level`: Pump setting (0-1)
- `recommended_heater_level`: Heater setting (0-1)
- `confidence`: Model confidence in the decision
- `reasoning`: Human-readable explanation
- `affected_factors`: List of factors affecting the decision

## Training Data

The model is trained on synthetic data generated from domain knowledge:
- Normal operating conditions
- Good conditions
- Poor conditions
- Critical situations

Training data is generated based on aquaculture rules and best practices.

## Integration

The decision model can be integrated with:
- Manager Agent (replace or enhance LLM-based decisions)
- Standalone Decision Agent
- Hybrid approach (use both LLM and model)

## Requirements

- PyTorch
- NumPy
- Pydantic (for data models)

## Model Performance

After training, the model should achieve:
- Action type accuracy: >85%
- Urgency prediction MAE: <0.15
- Priority ranking accuracy: >80%

## Future Improvements

- Fine-tune on real farm data
- Add temporal features (historical trends)
- Ensemble with multiple models
- Online learning from feedback
- Explainability improvements

