import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    # Generate normal listings
    # prices range roughly from $10 to $1000
    # condition scores from 1 to 5
    # days_active from 1 to 30
    normal_prices = np.random.normal(loc=300, scale=100, size=int(num_samples * 0.95))
    normal_conditions = np.random.randint(1, 6, size=int(num_samples * 0.95))
    normal_days = np.random.randint(1, 30, size=int(num_samples * 0.95))
    
    # Generate fraudulent/anomalous listings
    # Extremely low or extremely high prices
    fraud_prices = np.concatenate([
        np.random.uniform(0.1, 5, size=int(num_samples * 0.025)),  # Too cheap
        np.random.uniform(2000, 5000, size=int(num_samples * 0.025))  # Too expensive
    ])
    fraud_conditions = np.random.randint(1, 6, size=int(num_samples * 0.05))
    fraud_days = np.random.randint(0, 2, size=int(num_samples * 0.05)) # Just created
    
    prices = np.concatenate([normal_prices, fraud_prices])
    conditions = np.concatenate([normal_conditions, fraud_conditions])
    days_active = np.concatenate([normal_days, fraud_days])
    
    df = pd.DataFrame({
        'price': prices,
        'condition_score': conditions,
        'days_active': days_active
    })
    
    # Add some noise
    df['price'] = df['price'].clip(lower=0.1)
    
    return df

def train_model():
    print("Generating synthetic dataset...")
    df = generate_synthetic_data(10000)
    
    print("Training Isolation Forest model...")
    model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    model.fit(df)
    
    # Create models directory if it doesn't exist
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    model_path = os.path.join(models_dir, 'fraud_model.pkl')
    print(f"Saving model to {model_path}...")
    joblib.dump(model, model_path)
    print("Training complete.")

if __name__ == "__main__":
    train_model()
