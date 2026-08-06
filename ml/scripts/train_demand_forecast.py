import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
import os

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    print("Prophet is not installed. Falling back to a simple mock model.")

def generate_time_series_data():
    np.random.seed(42)
    dates = [datetime.today() - timedelta(days=x) for x in range(365, 0, -1)]
    
    # Simulate demand for "screen" and "battery"
    # Screens have higher demand in summer/monsoon due to water/drop damage
    # Batteries have steady increasing demand as devices age
    data = []
    for d in dates:
        # Base demand + some noise
        screen_demand = 50 + 20 * np.sin(d.month * np.pi / 6) + np.random.normal(0, 5)
        battery_demand = 30 + (365 - (datetime.today() - d).days) * 0.1 + np.random.normal(0, 3)
        
        data.append({
            'ds': d,
            'screen_y': max(0, screen_demand),
            'battery_y': max(0, battery_demand)
        })
        
    return pd.DataFrame(data)

def train_demand_models():
    print("Generating synthetic demand data for the last 365 days...")
    df = generate_time_series_data()
    
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    if PROPHET_AVAILABLE:
        print("Training Prophet models for Screen and Battery...")
        
        # Screen model
        df_screen = df[['ds', 'screen_y']].rename(columns={'screen_y': 'y'})
        m_screen = Prophet(yearly_seasonality=True, daily_seasonality=False)
        m_screen.fit(df_screen)
        
        # Battery model
        df_battery = df[['ds', 'battery_y']].rename(columns={'battery_y': 'y'})
        m_battery = Prophet(yearly_seasonality=True, daily_seasonality=False)
        m_battery.fit(df_battery)
        
        model_data = {
            'screen': m_screen,
            'battery': m_battery,
            'type': 'prophet'
        }
    else:
        print("Creating fallback mock forecast model...")
        # Just save the last few averages
        model_data = {
            'screen_avg': df['screen_y'].tail(30).mean(),
            'battery_avg': df['battery_y'].tail(30).mean(),
            'type': 'mock'
        }
        
    model_path = os.path.join(models_dir, 'demand_forecast_model.pkl')
    print(f"Saving demand forecast model to {model_path}...")
    joblib.dump(model_data, model_path)
    print("Demand forecasting model training complete.")

if __name__ == "__main__":
    train_demand_models()
