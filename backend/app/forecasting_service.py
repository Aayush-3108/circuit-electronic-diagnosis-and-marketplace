from pathlib import Path
# pyrefly: ignore [missing-import]
import joblib

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"

class ForecastingService:
    def __init__(self):
        try:
            self.model_data = joblib.load(MODELS_DIR / "demand_forecast_model.pkl")
        except FileNotFoundError:
            self.model_data = None

    def get_forecast(self) -> dict:
        if self.model_data is None:
            return {"error": "Forecast model not available", "forecasts": {}}
            
        if self.model_data.get('type') == 'mock':
            return {
                "forecasts": {
                    "screen": {
                        "trend": "stable",
                        "predicted_demand_score": round(self.model_data.get('screen_avg', 50), 2)
                    },
                    "battery": {
                        "trend": "increasing",
                        "predicted_demand_score": round(self.model_data.get('battery_avg', 50), 2)
                    }
                }
            }
        else:
            # We would use prophet to predict future dates here.
            # Simplified for now.
            return {
                "forecasts": {
                    "screen": {"trend": "increasing", "predicted_demand_score": 75},
                    "battery": {"trend": "increasing", "predicted_demand_score": 80}
                }
            }

forecasting_service = ForecastingService()
