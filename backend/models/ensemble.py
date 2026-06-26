import logging
import datetime
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, HistGradientBoostingRegressor
from backend.models.lstm import LSTMPredictor

logger = logging.getLogger("quantumstock.models.ensemble")

# Dynamic Imports with Fallbacks
try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    logger.warning("XGBoost not available. Falling back to sklearn GradientBoostingRegressor.")

try:
    import lightgbm as lgb
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False
    logger.warning("LightGBM not available. Falling back to sklearn HistGradientBoostingRegressor.")

try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False
    logger.warning("Prophet not available. Falling back to statsmodels AutoReg (ARIMA) forecaster.")

if not HAS_PROPHET:
    try:
        from statsmodels.tsa.ar_model import AutoReg
        HAS_AUTOREG = True
    except ImportError:
        HAS_AUTOREG = False
        logger.warning("statsmodels is not available. Falling back to simpler exponential smoothing.")


class EnsemblePredictor:
    def __init__(self, symbol: str):
        self.symbol = symbol
        self.scaler = MinMaxScaler()
        self.models = {}
        self.weights = {}
        self.features = [
            "Open", "High", "Low", "Close", "Volume",
            "RSI", "MACD", "MACD_Signal", "MACD_Hist",
            "SMA_20", "BB_Upper", "BB_Lower", "SMA_50",
            "SMA_100", "SMA_200", "EMA_12", "EMA_26", "Volatility"
        ]

    def _train_tabular_models(self, X_train, y_train):
        """Trains Random Forest, XGBoost (or fallback), and LightGBM (or fallback)."""
        # Random Forest
        rf = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
        rf.fit(X_train, y_train)
        self.models["Random Forest"] = rf

        # XGBoost or Fallback
        if HAS_XGB:
            try:
                xg = xgb.XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42)
                xg.fit(X_train, y_train)
                self.models["XGBoost"] = xg
            except Exception as e:
                logger.error(f"XGBoost train failed ({e}). Using sklearn fallback.")
                xg_fb = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
                xg_fb.fit(X_train, y_train)
                self.models["XGBoost"] = xg_fb
        else:
            xg_fb = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
            xg_fb.fit(X_train, y_train)
            self.models["XGBoost"] = xg_fb

        # LightGBM or Fallback
        if HAS_LGBM:
            try:
                lgb_model = lgb.LGBMRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42, verbose=-1)
                lgb_model.fit(X_train, y_train)
                self.models["LightGBM"] = lgb_model
            except Exception as e:
                logger.error(f"LightGBM train failed ({e}). Using HistGB fallback.")
                lgb_fb = HistGradientBoostingRegressor(max_iter=100, max_depth=5, random_state=42)
                lgb_fb.fit(X_train, y_train)
                self.models["LightGBM"] = lgb_fb
        else:
            lgb_fb = HistGradientBoostingRegressor(max_iter=100, max_depth=5, random_state=42)
            lgb_fb.fit(X_train, y_train)
            self.models["LightGBM"] = lgb_fb

    def _train_time_series_model(self, df: pd.DataFrame):
        """Trains Prophet (or AutoReg fallback)."""
        df_prophet = df.reset_index()[["Date", "Close"]].rename(columns={"Date": "ds", "Close": "y"})
        # Remove timezone info if present to avoid Prophet/pandas conflicts
        df_prophet["ds"] = pd.to_datetime(df_prophet["ds"]).dt.tz_localize(None)

        if HAS_PROPHET:
            try:
                m = Prophet(daily_seasonality=True, yearly_seasonality=True, weekly_seasonality=True)
                m.fit(df_prophet)
                self.models["Prophet"] = m
                return
            except Exception as e:
                logger.error(f"Prophet train failed ({e}). Using AutoReg fallback.")

        # Fallback to statsmodels AutoReg or basic exponential smoothing
        if HAS_AUTOREG:
            try:
                ar = AutoReg(df_prophet["y"].values, lags=15)
                self.models["Prophet"] = ar.fit()
            except Exception as e:
                logger.error(f"AutoReg train failed ({e}). Using SMA forecast fallback.")
                self.models["Prophet"] = "simple_avg"
        else:
            self.models["Prophet"] = "simple_avg"

    def fit_and_evaluate(self, df: pd.DataFrame):
        """Fits all models, evaluates their accuracy, and calculates voting weights."""
        logger.info(f"Training ensemble models for {self.symbol}...")
        
        # 1. Scaling feature columns
        scaled_data = self.scaler.fit_transform(df[self.features])
        df_scaled = pd.DataFrame(scaled_data, columns=self.features, index=df.index)
        
        # Prepare tabular labels: Shift Close price by -1 to predict next day Close
        X = df_scaled.iloc[:-1].values
        y = df_scaled["Close"].shift(-1).dropna().values
        
        # Train-Test Split (last 30 days for test evaluation)
        split_idx = max(int(len(X) * 0.90), len(X) - 30)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Fit Tabular Models
        self._train_tabular_models(X_train, y_train)

        # Fit LSTM Model
        lstm = LSTMPredictor(seq_len=30, epochs=12, batch_size=32)
        lstm.fit(scaled_data[:split_idx])
        self.models["LSTM"] = lstm
        
        # Fit Prophet/Time-series on the training portion
        train_df = df.iloc[:split_idx]
        self._train_time_series_model(train_df)
        
        # Evaluate model accuracies to set weights
        errors = {}
        
        # 1. Eval Random Forest
        rf_pred = self.models["Random Forest"].predict(X_test)
        errors["Random Forest"] = np.mean(np.abs(y_test - rf_pred))
        
        # 2. Eval XGBoost
        xgb_pred = self.models["XGBoost"].predict(X_test)
        errors["XGBoost"] = np.mean(np.abs(y_test - xgb_pred))
        
        # 3. Eval LightGBM
        lgb_pred = self.models["LightGBM"].predict(X_test)
        errors["LightGBM"] = np.mean(np.abs(y_test - lgb_pred))
        
        # 4. Eval LSTM
        lstm_preds = []
        for i in range(len(X_test)):
            seq_start = split_idx - 30 + i
            seq = scaled_data[seq_start:seq_start+30]
            lstm_preds.append(lstm.predict(seq))
        errors["LSTM"] = np.mean(np.abs(y_test - np.array(lstm_preds)))

        # 5. Eval Prophet/ARIMA (we forecast the length of y_test)
        prophet_preds = []
        if HAS_PROPHET and isinstance(self.models["Prophet"], Prophet):
            future = self.models["Prophet"].make_future_dataframe(periods=len(y_test))
            forecast = self.models["Prophet"].predict(future)
            # Scale the prophet forecast close
            forecast_close = forecast["yhat"].iloc[-len(y_test):].values
            forecast_close_scaled = (forecast_close - self.scaler.data_min_[3]) / (self.scaler.data_max_[3] - self.scaler.data_min_[3] + 1e-9)
            errors["Prophet"] = np.mean(np.abs(y_test - forecast_close_scaled))
        elif hasattr(self.models["Prophet"], "predict"): # AutoReg
            ar_pred = self.models["Prophet"].predict(start=split_idx, end=split_idx + len(y_test) - 1)
            ar_scaled = (ar_pred - self.scaler.data_min_[3]) / (self.scaler.data_max_[3] - self.scaler.data_min_[3] + 1e-9)
            errors["Prophet"] = np.mean(np.abs(y_test - ar_scaled))
        else: # Simple average fallback
            avg_pred = np.repeat(np.mean(y_train), len(y_test))
            errors["Prophet"] = np.mean(np.abs(y_test - avg_pred))

        # Re-train models on ALL historical data for final predictions
        logger.info("Re-training models on complete dataset for final predictions...")
        self._train_tabular_models(X, y)
        self.models["LSTM"].fit(scaled_data)
        self._train_time_series_model(df)
        
        # Calculate weights: Inv-error soft thresholding
        inv_errors = {m: 1.0 / (err + 1e-6) for m, err in errors.items()}
        total_inv = sum(inv_errors.values())
        self.weights = {m: val / total_inv for m, val in inv_errors.items()}
        logger.info(f"Model Weights: {self.weights}")

    def forecast_horizons(self, df: pd.DataFrame) -> dict:
        """Generates predictions for Tomorrow (1d), 7d, 30d, 90d, 1y horizons."""
        latest_row = df[self.features].iloc[-1:].copy()
        scaled_features = self.scaler.transform(df[self.features])
        latest_scaled = scaled_features[-1:]
        current_price = float(df["Close"].iloc[-1])
        
        # Prepare sequence for LSTM
        lstm_sequence = scaled_features[-30:] # last 30 days
        
        predictions_1d = {}
        
        # 1. Random Forest
        rf_scaled = self.models["Random Forest"].predict(latest_scaled)[0]
        predictions_1d["Random Forest"] = float(rf_scaled * (self.scaler.data_max_[3] - self.scaler.data_min_[3]) + self.scaler.data_min_[3])
        
        # 2. XGBoost
        xgb_scaled = self.models["XGBoost"].predict(latest_scaled)[0]
        predictions_1d["XGBoost"] = float(xgb_scaled * (self.scaler.data_max_[3] - self.scaler.data_min_[3]) + self.scaler.data_min_[3])
        
        # 3. LightGBM
        lgb_scaled = self.models["LightGBM"].predict(latest_scaled)[0]
        predictions_1d["LightGBM"] = float(lgb_scaled * (self.scaler.data_max_[3] - self.scaler.data_min_[3]) + self.scaler.data_min_[3])
        
        # 4. LSTM
        lstm_scaled = self.models["LSTM"].predict(lstm_sequence)
        predictions_1d["LSTM"] = float(lstm_scaled * (self.scaler.data_max_[3] - self.scaler.data_min_[3]) + self.scaler.data_min_[3])

        # 5. Prophet / AutoReg
        if HAS_PROPHET and isinstance(self.models["Prophet"], Prophet):
            future = self.models["Prophet"].make_future_dataframe(periods=365)
            forecast = self.models["Prophet"].predict(future)
            # Fetch indices matching target offsets
            prophet_1d = float(forecast["yhat"].iloc[-365])
            prophet_7d = float(forecast["yhat"].iloc[-365 + 6])
            prophet_30d = float(forecast["yhat"].iloc[-365 + 29])
            prophet_90d = float(forecast["yhat"].iloc[-365 + 89])
            prophet_1y = float(forecast["yhat"].iloc[-1])
        elif hasattr(self.models["Prophet"], "predict"): # AutoReg
            n_samples = len(df)
            ar_forecasts = self.models["Prophet"].predict(start=n_samples, end=n_samples + 365)
            prophet_1d = float(ar_forecasts[0])
            prophet_7d = float(ar_forecasts[6])
            prophet_30d = float(ar_forecasts[29])
            prophet_90d = float(ar_forecasts[89])
            prophet_1y = float(ar_forecasts[365])
        else: # Simple average fallback
            avg_val = float(df["Close"].mean())
            prophet_1d = avg_val
            prophet_7d = avg_val
            prophet_30d = avg_val
            prophet_90d = avg_val
            prophet_1y = avg_val
            
        predictions_1d["Prophet"] = prophet_1d
        
        # Weighted tomorrow prediction
        weighted_1d = sum(predictions_1d[m] * self.weights[m] for m in predictions_1d)
        
        # Multi-horizon extrapolations combining Trend of Prophet with ensemble offset
        trend_diff_7d = prophet_7d - prophet_1d
        trend_diff_30d = prophet_30d - prophet_1d
        trend_diff_90d = prophet_90d - prophet_1d
        trend_diff_1y = prophet_1y - prophet_1d
        
        weighted_7d = weighted_1d + trend_diff_7d
        weighted_30d = weighted_1d + trend_diff_30d
        weighted_90d = weighted_1d + trend_diff_90d
        weighted_1y = weighted_1d + trend_diff_1y

        # Generate metrics for each horizon
        horizons = {
            "1d": {"target": weighted_1d, "days": 1},
            "7d": {"target": weighted_7d, "days": 7},
            "30d": {"target": weighted_30d, "days": 30},
            "90d": {"target": weighted_90d, "days": 90},
            "1y": {"target": weighted_1y, "days": 365}
        }
        
        output = {}
        recent_volatility = float(df["Volatility"].iloc[-20:].mean()) # standard deviation of returns
        
        for name, spec in horizons.items():
            target_price = spec["target"]
            days = spec["days"]
            
            # Predict Range using Volatility scaling over time root
            std_dev_vol = target_price * recent_volatility * np.sqrt(days) * 0.5
            # Ensure minimum standard deviation of 1.5% of target price to avoid single point ranges
            std_dev_vol = max(std_dev_vol, target_price * 0.015)
            
            predicted_min = float(target_price - (1.96 * std_dev_vol))
            predicted_max = float(target_price + (1.96 * std_dev_vol))
            
            # Clamp prices to > 0
            predicted_min = max(0.01, predicted_min)
            predicted_max = max(0.02, predicted_max)

            # Probabilities (Bullish / Bearish / Neutral)
            price_change = (target_price - current_price) / current_price
            
            # Log odds scaled probabilities
            sig = 1.0 / (1.0 + np.exp(-price_change * 15.0 / np.sqrt(days)))
            buy_prob = float(sig)
            sell_prob = float(1.0 - sig)
            
            # Trend probability (bullish score out of 100)
            trend_prob = float(buy_prob * 100)
            
            # Consensus Score among ML Models for 1d (scales down confidence if models disagree)
            consensus_factor = 1.0
            if name == "1d":
                var_preds = np.var(list(predictions_1d.values()))
                mean_preds = np.mean(list(predictions_1d.values()))
                coef_var = np.sqrt(var_preds) / (mean_preds + 1e-9)
                consensus_factor = max(0.4, 1.0 - (coef_var * 5.0)) # penalize high variation

            # Confidence Score
            confidence_score = float(max(10.0, min(98.0, (100.0 * consensus_factor / np.sqrt(days)))))
            
            # Risk Score (0-100 scale, based on volatility, timeframe, and drawdown)
            risk_score = float(max(5.0, min(95.0, (recent_volatility * 1000.0 * np.sqrt(days) * 0.3))))
            
            output[name] = {
                "current_price": current_price,
                "predicted_price": float(target_price),
                "predicted_min": predicted_min,
                "predicted_max": predicted_max,
                "buy_probability": buy_prob,
                "sell_probability": sell_prob,
                "trend_probability": trend_prob,
                "confidence_score": confidence_score,
                "risk_score": risk_score
            }

        return {
            "predictions": output,
            "weights": self.weights,
            "individual_predictions_1d": predictions_1d
        }
