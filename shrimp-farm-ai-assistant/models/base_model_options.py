"""
Base Model Options for Decision Making

This file demonstrates how to use various pre-trained/base models
instead of training from scratch.
"""

# ============================================================================
# Option 1: AutoGluon (Recommended - Easiest)
# ============================================================================

def use_autogluon():
    """Use AutoGluon for decision making"""
    try:
        from autogluon.tabular import TabularPredictor
        import pandas as pd
        
        # Prepare your data as DataFrame
        # train_data should have columns: features + 'action_type', 'urgency', etc.
        
        # Action classification
        action_predictor = TabularPredictor(
            label='action_type',
            problem_type='multiclass',
            eval_metric='accuracy'
        )
        # action_predictor.fit(train_data, time_limit=360)  # 6 minutes
        
        # Urgency regression
        urgency_predictor = TabularPredictor(
            label='urgency',
            problem_type='regression',
            eval_metric='root_mean_squared_error'
        )
        # urgency_predictor.fit(train_data, time_limit=360)
        
        return {
            'action_predictor': action_predictor,
            'urgency_predictor': urgency_predictor,
            'type': 'autogluon'
        }
    except ImportError:
        print("AutoGluon not installed. Install with: pip install autogluon")
        return None


# ============================================================================
# Option 2: TabNet (More Control)
# ============================================================================

def use_tabnet():
    """Use TabNet for decision making"""
    try:
        from pytorch_tabnet.tab_model import TabNetClassifier, TabNetRegressor
        import numpy as np
        
        # Action classification
        action_model = TabNetClassifier(
            n_d=64, n_a=64,
            n_steps=5,
            gamma=1.5,
            n_independent=2,
            n_shared=2,
            epsilon=1e-15,
            seed=42,
            device_name='cpu'
        )
        
        # Urgency regression
        urgency_model = TabNetRegressor(
            n_d=64, n_a=64,
            n_steps=5,
            gamma=1.5,
            n_independent=2,
            n_shared=2,
            epsilon=1e-15,
            seed=42,
            device_name='cpu'
        )
        
        # Training example:
        # action_model.fit(
        #     X_train, y_action_train,
        #     eval_set=[(X_val, y_action_val)],
        #     max_epochs=100,
        #     patience=20
        # )
        
        return {
            'action_model': action_model,
            'urgency_model': urgency_model,
            'type': 'tabnet'
        }
    except ImportError:
        print("TabNet not installed. Install with: pip install pytorch-tabnet")
        return None


# ============================================================================
# Option 3: XGBoost / LightGBM (Fast & Effective)
# ============================================================================

def use_xgboost():
    """Use XGBoost for decision making"""
    try:
        import xgboost as xgb
        from sklearn.multioutput import MultiOutputClassifier, MultiOutputRegressor
        
        # Action classification
        action_model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        # Urgency regression
        urgency_model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        return {
            'action_model': action_model,
            'urgency_model': urgency_model,
            'type': 'xgboost'
        }
    except ImportError:
        print("XGBoost not installed. Install with: pip install xgboost")
        return None


def use_lightgbm():
    """Use LightGBM for decision making"""
    try:
        import lightgbm as lgb
        
        # Action classification
        action_model = lgb.LGBMClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        # Urgency regression
        urgency_model = lgb.LGBMRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        return {
            'action_model': action_model,
            'urgency_model': urgency_model,
            'type': 'lightgbm'
        }
    except ImportError:
        print("LightGBM not installed. Install with: pip install lightgbm")
        return None


# ============================================================================
# Option 4: FT-Transformer (Advanced)
# ============================================================================

def use_ft_transformer():
    """Use FT-Transformer for decision making"""
    try:
        from rtdl import FTTransformer
        import torch
        
        # Create model
        model = FTTransformer.make_baseline(
            n_num_features=35,  # Your 35 features
            cat_cardinalities=[],  # No categorical features
            d_token=192,
            n_blocks=3,
            attention_dropout=0.2,
            ffn_d_hidden=768,
            ffn_dropout=0.1,
            residual_dropout=0.0,
            last_layer_query_idx=None,
            n_heads=8,
            kv_compression_ratio=None,
            kv_compression_sharing=None,
            head_activation='relu',
            head_normalization='LayerNorm',
            d_out=8  # 8 action types + other outputs
        )
        
        return {
            'model': model,
            'type': 'ft_transformer'
        }
    except ImportError:
        print("FT-Transformer not installed. Install with: pip install rtdl")
        return None


# ============================================================================
# Option 5: scikit-learn Ensemble (Simple & Reliable)
# ============================================================================

def use_sklearn_ensemble():
    """Use scikit-learn ensemble methods"""
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
    
    # Random Forest
    action_model_rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )
    
    urgency_model_rf = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )
    
    # Gradient Boosting
    action_model_gb = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    
    urgency_model_gb = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    
    return {
        'random_forest': {
            'action': action_model_rf,
            'urgency': urgency_model_rf
        },
        'gradient_boosting': {
            'action': action_model_gb,
            'urgency': urgency_model_gb
        },
        'type': 'sklearn'
    }


# ============================================================================
# Model Factory - Choose Your Base Model
# ============================================================================

class BaseModelFactory:
    """Factory to create base models for decision making"""
    
    @staticmethod
    def create_model(model_type='autogluon'):
        """
        Create a base model based on type.
        
        Args:
            model_type: 'autogluon', 'tabnet', 'xgboost', 'lightgbm', 
                       'ft_transformer', 'sklearn'
        
        Returns:
            Model configuration dictionary
        """
        model_creators = {
            'autogluon': use_autogluon,
            'tabnet': use_tabnet,
            'xgboost': use_xgboost,
            'lightgbm': use_lightgbm,
            'ft_transformer': use_ft_transformer,
            'sklearn': use_sklearn_ensemble
        }
        
        if model_type not in model_creators:
            raise ValueError(
                f"Unknown model type: {model_type}. "
                f"Choose from: {list(model_creators.keys())}"
            )
        
        return model_creators[model_type]()
    
    @staticmethod
    def get_available_models():
        """Get list of available base models"""
        models = []
        
        for model_type in ['autogluon', 'tabnet', 'xgboost', 'lightgbm', 
                          'ft_transformer', 'sklearn']:
            try:
                result = BaseModelFactory.create_model(model_type)
                if result:
                    models.append(model_type)
            except:
                pass
        
        return models


# ============================================================================
# Usage Example
# ============================================================================

if __name__ == "__main__":
    print("Available Base Models for Decision Making")
    print("=" * 60)
    
    # Check available models
    factory = BaseModelFactory()
    available = factory.get_available_models()
    
    print(f"\nAvailable models: {available}")
    
    # Try to create each model
    for model_type in ['autogluon', 'tabnet', 'xgboost', 'lightgbm', 'sklearn']:
        print(f"\n{model_type.upper()}:")
        try:
            model = factory.create_model(model_type)
            if model:
                print(f"  ✓ {model_type} is available")
                print(f"  Type: {model.get('type', 'unknown')}")
            else:
                print(f"  ✗ {model_type} not available (install dependencies)")
        except Exception as e:
            print(f"  ✗ {model_type} error: {e}")

