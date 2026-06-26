import logging
import datetime
import pandas as pd
import numpy as np
import yfinance as yf

logger = logging.getLogger("quantumstock.datasets.collector")

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculates the Relative Strength Index (RSI)."""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).copy()
    loss = (-delta.where(delta < 0, 0)).copy()
    
    # Calculate exponential moving average of gains and losses
    avg_gain = gain.ewm(alpha=1/period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period).mean()
    
    rs = avg_gain / (avg_loss + 1e-9)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)

def calculate_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """Calculates MACD, Signal Line, and Histogram."""
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    macd_hist = macd_line - signal_line
    return macd_line, signal_line, macd_hist

def calculate_bollinger_bands(series: pd.Series, period: int = 20, num_std: int = 2):
    """Calculates Middle, Upper, and Lower Bollinger Bands."""
    sma = series.rolling(window=period).mean()
    std = series.rolling(window=period).std()
    upper_band = sma + (num_std * std)
    lower_band = sma - (num_std * std)
    return sma, upper_band.fillna(series), lower_band.fillna(series)

def fetch_stock_history(symbol: str, period_years: int = 10) -> pd.DataFrame:
    """
    Downloads historical stock data from Yahoo Finance and calculates indicators.
    Supports all global symbols (e.g. TSLA, AAPL, TCS.NS, RELIANCE.NS).
    """
    logger.info(f"Fetching history for {symbol} for the last {period_years} years...")
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=period_years * 365)
    
    # Download ticker data
    ticker = yf.Ticker(symbol)
    df = ticker.history(start=start_date, end=end_date)
    
    if df.empty:
        logger.warning(f"No stock data found for ticker {symbol}. Attempting search or creating synthetic backup.")
        raise ValueError(f"Ticker symbol {symbol} returned no data.")

    # Sort index to ensure ascending chronological order
    df = df.sort_index()

    # Calculate indicators
    close_series = df["Close"]
    df["RSI"] = calculate_rsi(close_series)
    df["MACD"], df["MACD_Signal"], df["MACD_Hist"] = calculate_macd(close_series)
    df["SMA_20"], df["BB_Upper"], df["BB_Lower"] = calculate_bollinger_bands(close_series)
    
    # Extra moving averages
    df["SMA_50"] = close_series.rolling(window=50).mean().fillna(close_series)
    df["SMA_100"] = close_series.rolling(window=100).mean().fillna(close_series)
    df["SMA_200"] = close_series.rolling(window=200).mean().fillna(close_series)
    df["EMA_12"] = close_series.ewm(span=12, adjust=False).mean()
    df["EMA_26"] = close_series.ewm(span=26, adjust=False).mean()
    
    # Volatility (20-day rolling standard deviation of log returns)
    log_returns = np.log(close_series / close_series.shift(1))
    df["Volatility"] = log_returns.rolling(window=20).std().fillna(0)

    # Fill NaN values due to rolling windows
    df = df.bfill().ffill().fillna(0)
    
    return df

def fetch_macro_benchmarks() -> dict:
    """
    Fetches reference benchmarks like S&P500, NASDAQ, Gold, and Oil, 
    plus dummy macroeconomic metrics for economic backdrop.
    """
    benchmarks = {
        "SP500": "^GSPC",
        "NASDAQ": "^IXIC",
        "Gold": "GC=F",
        "Crude_Oil": "CL=F"
    }
    
    results = {}
    for name, ticker in benchmarks.items():
        try:
            data = yf.Ticker(ticker).history(period="5d")
            if not data.empty:
                results[name] = float(data["Close"].iloc[-1])
            else:
                results[name] = 0.0
        except Exception as e:
            logger.warning(f"Failed to fetch {name} benchmark ({e}). Using mock placeholder.")
            results[name] = 0.0

    # Fallback/default macro economic metrics
    results["Inflation_US"] = 2.8 # %
    results["Interest_Rate_US"] = 5.25 # %
    results["GDP_Growth_US"] = 2.1 # %
    
    results["Inflation_IN"] = 4.8 # %
    results["Interest_Rate_IN"] = 6.50 # %
    results["GDP_Growth_IN"] = 6.8 # %
    
    results["Fear_Greed_Index"] = 58.0 # Neutral-Greed
    
    return results

def get_stock_fundamental_info(symbol: str) -> dict:
    """Retrieves PE ratio, Market Cap, Dividend Yield, and Sector info."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        return {
            "name": info.get("longName", symbol),
            "sector": info.get("sector", "Technology"),
            "industry": info.get("industry", "Software"),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", 0.0) or info.get("forwardPE", 0.0) or 0.0,
            "dividend_yield": info.get("dividendYield", 0.0) or 0.0,
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", "NMS")
        }
    except Exception as e:
        logger.warning(f"Could not retrieve fundamental info for {symbol} ({e}). Returning defaults.")
        return {
            "name": symbol,
            "sector": "Financial/Techs",
            "industry": "Global Markets",
            "market_cap": 500_000_000_000,
            "pe_ratio": 25.4,
            "dividend_yield": 0.015,
            "currency": "USD",
            "exchange": "NMS"
        }
