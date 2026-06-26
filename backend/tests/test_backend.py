import os
import unittest
import numpy as np
import pandas as pd

from backend.auth.security import hash_password, verify_password, create_access_token, verify_access_token, generate_otp_secret, verify_otp
from backend.datasets.collector import calculate_rsi, calculate_macd, calculate_bollinger_bands
from backend.services.portfolio import PortfolioOptimizer
from backend.services.backtesting import BacktestingEngine

class QuantumStockBackendTests(unittest.TestCase):
    
    def test_security_helpers(self):
        """Verifies hashing, JWT generation, and OTP validation functions."""
        password = "quantum_cyber_secure"
        hashed = hash_password(password)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("wrong_password", hashed))
        
        # Test JWT
        token = create_access_token({"sub": "test@quantumstock.com"})
        payload = verify_access_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload.get("sub"), "test@quantumstock.com")
        
        # Test OTP
        secret = generate_otp_secret()
        self.assertEqual(len(secret), 32)
        # Note: can't easily check verify_otp current value without a clock offset,
        # but verifies that it processes without errors.
        self.assertFalse(verify_otp(secret, "000000"))

    def test_technical_indicators(self):
        """Verifies RSI, MACD, and Bollinger Bands calculation logic."""
        np.random.seed(42)
        prices = pd.Series(100.0 + np.cumsum(np.random.normal(0.1, 1.0, 100)))
        
        # RSI Check
        rsi = calculate_rsi(prices)
        self.assertEqual(len(rsi), len(prices))
        self.assertTrue((rsi >= 0).all() and (rsi <= 100).all())
        
        # MACD Check
        macd_line, signal_line, macd_hist = calculate_macd(prices)
        self.assertEqual(len(macd_line), len(prices))
        self.assertEqual(len(signal_line), len(prices))
        self.assertEqual(len(macd_hist), len(prices))
        
        # Bollinger Bands Check
        sma, upper, lower = calculate_bollinger_bands(prices)
        self.assertEqual(len(sma), len(prices))
        self.assertTrue((upper[20:] >= sma[20:]).all())
        self.assertTrue((lower[20:] <= sma[20:]).all())

    def test_portfolio_optimizer(self):
        """Verifies portfolio allocations weight and total return summation."""
        # Check optimization returns mock/real output structured correctly
        budget = 50000.0
        result = PortfolioOptimizer.optimize(budget, "High", "Long", "US")
        
        self.assertEqual(result["budget"], budget)
        self.assertEqual(result["risk_appetite"], "High")
        self.assertIn("allocations", result)
        self.assertTrue(len(result["allocations"]) > 0)
        
        # Sum weights
        total_pct = sum(a["percentage"] for a in result["allocations"])
        self.assertAlmostEqual(total_pct, 100.0, places=1)
        
        # Sum amount
        total_amount = sum(a["amount"] for a in result["allocations"])
        self.assertAlmostEqual(total_amount, budget, places=1)

    def test_backtester_simulator(self):
        """Verifies backtester outputs return structure and trade tracking."""
        initial_cap = 20000.0
        res = BacktestingEngine.run_backtest(
            symbol="AAPL",
            strategy="RSI Reversal",
            initial_capital=initial_cap,
            start_date="2025-01-01",
            end_date="2026-06-01"
        )
        
        self.assertEqual(res["initial_capital"], initial_cap)
        self.assertIn("final_value", res)
        self.assertIn("profit_loss", res)
        self.assertIn("equity_curve", res)
        self.assertTrue(len(res["equity_curve"]) > 0)
        self.assertIn("trades", res)

if __name__ == "__main__":
    unittest.main()
