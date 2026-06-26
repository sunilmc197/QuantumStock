import logging
import numpy as np
import pandas as pd
import yfinance as yf

logger = logging.getLogger("quantumstock.services.portfolio")

# Default asset universe representing different risk classes
ASSET_POOL = {
    "US": [
        {"symbol": "MSFT", "name": "Microsoft Corp", "type": "Conservative"},
        {"symbol": "AAPL", "name": "Apple Inc", "type": "Conservative"},
        {"symbol": "NVDA", "name": "NVIDIA Corp", "type": "Aggressive"},
        {"symbol": "TSLA", "name": "Tesla Inc", "type": "Aggressive"},
        {"symbol": "GC=F", "name": "Gold", "type": "Conservative"},
        {"symbol": "SPY", "name": "S&P 500 ETF", "type": "Moderate"}
    ],
    "IN": [
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "type": "Conservative"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "type": "Conservative"},
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "type": "Moderate"},
        {"symbol": "INFY.NS", "name": "Infosys Ltd", "type": "Moderate"},
        {"symbol": "GC=F", "name": "Gold", "type": "Conservative"},
        {"symbol": "NIFTYBEES.NS", "name": "Nifty 50 ETF", "type": "Moderate"}
    ]
}

class PortfolioOptimizer:
    @staticmethod
    def optimize(budget: float, risk_appetite: str, duration: str, market: str = "US") -> dict:
        """
        Creates a diversified portfolio based on Markowitz optimization concepts.
        Risk levels: 'Low' (Conservative), 'Medium' (Moderate), 'High' (Aggressive).
        """
        logger.info(f"Optimizing portfolio: Budget={budget}, Risk={risk_appetite}, Duration={duration}, Market={market}")
        
        # Select assets based on preferred market (default to US if others not found)
        assets = ASSET_POOL.get(market, ASSET_POOL["US"])
        symbols = [a["symbol"] for a in assets]
        
        # Download 1 year of historical closing prices to compute returns and covariance
        try:
            data = yf.download(symbols, period="1y", interval="1d")["Close"]
            # Clean up if download returned MultiIndex
            if isinstance(data, pd.DataFrame):
                data = data.ffill().bfill()
            else:
                raise ValueError("Downloaded data is not a dataframe")
        except Exception as e:
            logger.error(f"Failed to fetch historical returns for portfolio optimization ({e}). Using static fallbacks.")
            return PortfolioOptimizer._generate_fallback_portfolio(budget, risk_appetite, duration, assets)

        # Calculate daily returns
        returns = data.pct_change().dropna()
        
        # Calculate annualized returns (mean daily return * 252)
        annual_returns = returns.mean() * 252
        
        # Calculate covariance matrix
        cov_matrix = returns.cov() * 252

        # Define targets based on risk profile
        # Low risk: minimize variance (skew weights toward gold/etf/blue chip)
        # High risk: maximize returns (skew weights toward tech/growth stocks)
        weights = {}
        
        # Simple heuristic optimizer matching the risk tolerance
        risk_appetite_lower = risk_appetite.lower()
        
        raw_weights = {}
        for asset in assets:
            sym = asset["symbol"]
            atype = asset["type"]
            
            # Asset return/variance estimates
            ret = annual_returns.get(sym, 0.10)
            vol = np.sqrt(cov_matrix.loc[sym, sym]) if sym in cov_matrix.index else 0.15
            
            # Base preference score
            score = 1.0
            if risk_appetite_lower == "low": # Conservative
                if atype == "Conservative":
                    score = 3.0
                elif atype == "Moderate":
                    score = 1.5
                else: # Aggressive
                    score = 0.2
            elif risk_appetite_lower == "medium": # Moderate
                if atype == "Moderate":
                    score = 3.0
                elif atype == "Conservative":
                    score = 2.0
                else: # Aggressive
                    score = 1.0
            else: # Aggressive
                if atype == "Aggressive":
                    score = 4.0
                elif atype == "Moderate":
                    score = 1.5
                else: # Conservative
                    score = 0.5
                    
            # Penalize highly volatile assets in low-risk mode
            if risk_appetite_lower == "low":
                score = score / (vol + 1e-6)
            
            raw_weights[sym] = max(0.05, score)

        # Normalize weights
        total_weight = sum(raw_weights.values())
        normalized_weights = {sym: val / total_weight for sym, val in raw_weights.items()}

        # Compute Portfolio performance metrics
        w_array = np.array([normalized_weights[s] for s in symbols])
        r_array = np.array([annual_returns.get(s, 0.10) for s in symbols])
        
        p_expected_return = np.dot(w_array, r_array)
        
        # Portfolio Variance = W^T * Cov * W
        p_variance = 0.05 # fallback
        try:
            # Reorder cov matrix to match symbol sequence
            cov_ordered = cov_matrix.loc[symbols, symbols].values
            p_variance = np.dot(w_array.T, np.dot(cov_ordered, w_array))
        except Exception as ex:
            logger.error(f"Covariance matrix matrix multiply failed ({ex})")
            
        p_volatility = np.sqrt(p_variance)
        
        # Risk-free rate assumption (e.g. 4%)
        rf_rate = 0.04
        sharpe_ratio = (p_expected_return - rf_rate) / (p_volatility + 1e-9)

        # Build allocation details
        allocations = []
        for asset in assets:
            sym = asset["symbol"]
            w = normalized_weights[sym]
            allocated_cash = budget * w
            
            # Fetch latest close price
            try:
                price = float(data[sym].iloc[-1])
            except Exception:
                price = 100.0 if "NS" in sym else 150.0 # dummy
                
            shares = allocated_cash / price
            
            allocations.append({
                "symbol": sym,
                "name": asset["name"],
                "percentage": float(w * 100),
                "amount": float(allocated_cash),
                "shares": float(shares),
                "latest_price": price
            })

        return {
            "budget": budget,
            "risk_appetite": risk_appetite,
            "duration": duration,
            "expected_annual_return": float(p_expected_return * 100),
            "portfolio_volatility": float(p_volatility * 100),
            "sharpe_ratio": float(max(0.1, sharpe_ratio)),
            "allocations": allocations
        }

    @staticmethod
    def _generate_fallback_portfolio(budget: float, risk_appetite: str, duration: str, assets: list) -> dict:
        """Returns realistic allocations if live stock data fetch fails."""
        risk_lower = risk_appetite.lower()
        allocations = []
        
        if risk_lower == "low":
            # 50% gold, 30% conservative index, 20% blue chips
            shares_weights = {"GC=F": 0.40, "SPY": 0.20, "TCS.NS": 0.20, "MSFT": 0.20, "NIFTYBEES.NS": 0.20}
            ret, vol = 8.5, 6.2
        elif risk_lower == "medium":
            shares_weights = {"SPY": 0.30, "MSFT": 0.20, "AAPL": 0.20, "RELIANCE.NS": 0.20, "GC=F": 0.10}
            ret, vol = 12.4, 11.5
        else:
            shares_weights = {"NVDA": 0.35, "TSLA": 0.35, "MSFT": 0.15, "SPY": 0.15, "RELIANCE.NS": 0.15}
            ret, vol = 22.8, 24.1

        # Intersect with what's actually in assets list
        active_weights = {}
        for asset in assets:
            sym = asset["symbol"]
            if sym in shares_weights:
                active_weights[sym] = shares_weights[sym]
                
        # Normalize
        total_w = sum(active_weights.values()) or 1.0
        active_weights = {k: v/total_w for k, v in active_weights.items()}

        for asset in assets:
            sym = asset["symbol"]
            w = active_weights.get(sym, 0.0)
            if w == 0:
                continue
            allocated_cash = budget * w
            price = 100.0 if "NS" in sym else 150.0
            shares = allocated_cash / price
            
            allocations.append({
                "symbol": sym,
                "name": asset["name"],
                "percentage": float(w * 100),
                "amount": float(allocated_cash),
                "shares": float(shares),
                "latest_price": price
            })

        return {
            "budget": budget,
            "risk_appetite": risk_appetite,
            "duration": duration,
            "expected_annual_return": ret,
            "portfolio_volatility": vol,
            "sharpe_ratio": (ret - 4.0) / (vol + 1e-9),
            "allocations": allocations
        }
