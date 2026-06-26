import logging
import re
import pandas as pd
from backend.datasets.collector import fetch_stock_history, get_stock_fundamental_info
from backend.models.ensemble import EnsemblePredictor
from backend.services.explanations import ExplanationEngine
from backend.services.news import NewsService

logger = logging.getLogger("quantumstock.services.chatbot")

# Regex to detect stock tickers in a string (e.g. AAPL, TSLA, TCS.NS)
TICKER_REGEX = re.compile(r'\b([A-Z]{2,10}(?:\.[A-Z]{2,4})?)\b')

class FinancialChatbot:
    @staticmethod
    def generate_response(message: str, preferred_market: str = "US") -> dict:
        """
        Parses user messages, fetches real-time stats if ticker is detected,
        and constructs a financial analyst-grade response.
        """
        message_clean = message.upper()
        # Find any potential tickers in the message
        found_tickers = TICKER_REGEX.findall(message_clean)
        
        # Stopwords list in uppercase to avoid matching common words or financial terms as tickers
        stopwords = {
            "BUY", "SELL", "WHAT", "WHY", "HOW", "WHO", "WHOSE", "WHEN", "WHERE", "THE", "AND", "STOCK", "AI", "US", 
            "IN", "GDP", "RSI", "MACD", "PE", "IS", "ARE", "AM", "WAS", "WERE", "BE", "BEEN", "BEING", "HAVE", "HAS", 
            "HAD", "DO", "DOES", "DID", "A", "AN", "OF", "TO", "FOR", "WITH", "ON", "AT", "BY", "FROM", "ABOUT",
            "DESIGN", "DESIGNED", "DESIGNER", "DEVELOP", "DEVELOPER", "DEVELOPMENT", "CREATOR", "CREATE", "WEBSITE",
            "PLATFORM", "SYSTEM", "THIS", "THAT", "THESE", "THOSE", "IT", "THEY", "YOU", "HE", "SHE", "WE", "ME", "HIM",
            "HER", "THEM", "MY", "YOUR", "HIS", "ITS", "OUR", "THEIR", "MINE", "YOURS", "OURS", "THEIRS",
            "GO", "GOING", "WENT", "GONE", "CAN", "COULD", "WILL", "WOULD", "SHALL", "SHOULD", "MAY", "MIGHT", "MUST",
            "GET", "GOT", "GETTING", "MAKE", "MAKING", "MADE", "TAKE", "TAKING", "TOOK", "TAKEN", "GIVE", "GIVING", "GAVE",
            "SAY", "SAYING", "SAID", "ASK", "ASKING", "ASKED", "QUESTION", "QUESTIONS", "ANSWER", "ANSWERS",
            "BOLLINGER", "BAND", "BANDS", "PORTFOLIO", "OPTIMIZE", "OPTIMIZER", "BACKTEST", "BACKTESTER", "STRATEGY", 
            "STRATEGIES", "LSTM", "XGBOOST", "LIGHTGBM", "FOREST", "FORESTS", "PROPHET", "SEASONAL", "SAFEST", "SAFE",
            "HI", "HELLO", "HEY", "HELP", "GREET", "OK", "OKAY", "YES", "NO", "THANKS", "THANK"
        }
        
        tickers = [t for t in found_tickers if t not in stopwords]
        
        # If a ticker is found, we do an AI analysis run
        if len(tickers) > 0:
            symbol = tickers[0]
            try:
                # 1. Fetch History and Fundamentals
                df = fetch_stock_history(symbol, period_years=5)
                fundamentals = get_stock_fundamental_info(symbol)
                
                # 2. Run ensemble predictions
                predictor = EnsemblePredictor(symbol)
                predictor.fit_and_evaluate(df)
                pred_info = predictor.forecast_horizons(df)
                
                # 3. Fetch sentiment
                news_info = NewsService.get_news_sentiment(symbol)
                
                # 4. Generate SHAP explanations
                explainer = ExplanationEngine(predictor)
                exp_info = explainer.generate_explanations(df, pred_info)

                # Extract prediction metrics
                pred_1d = pred_info["predictions"]["1d"]
                pred_price = pred_1d["predicted_price"]
                buy_prob = pred_1d["buy_probability"] * 100
                trend_direction = exp_info["direction"]
                reasons = exp_info["reasons"]

                # Build a detailed response
                response_text = (
                    f"### QuantumStock AI Analysis for **{fundamentals['name']} ({symbol})**\n\n"
                    f"According to my **Multi-Model Ensemble Engine** (which combines LSTM, XGBoost, Random Forest, LightGBM, and Prophet/ARIMA), "
                    f"the 24-hour trend prediction is **{trend_direction}** with a **Buy Probability of {buy_prob:.1f}%** "
                    f"and a **Confidence Score of {pred_1d['confidence_score']:.1f}%**.\n\n"
                    f"**Predicted 1-Day Price Range:** ${pred_1d['predicted_min']:.2f} - ${pred_1d['predicted_max']:.2f} "
                    f"(Current close: ${pred_1d['current_price']:.2f}).\n\n"
                    f"**Key Catalysts driving this prediction:**\n"
                )
                
                for r in reasons:
                    response_text += f"- {r}\n"
                    
                # Append Sentiment Insights
                sentiment_class = news_info["overall_sentiment"]
                sentiment_score = news_info["overall_sentiment_score"]
                response_text += (
                    f"\n**News Sentiment Sentiment index:** {sentiment_class} (Score: {sentiment_score:+.2f}).\n"
                    f"**Market Sentiment Explainer:** {news_info['overall_explanation']}\n\n"
                    f"*Disclaimer: I am an AI model. Stock markets carry risk. Please consult a registered advisor before investing.*"
                )
                
                return {
                    "text": response_text,
                    "ticker": symbol,
                    "data": {
                        "price": pred_1d['current_price'],
                        "prediction": pred_price,
                        "buy_probability": buy_prob,
                        "sentiment": sentiment_class
                    }
                }
                
            except Exception as e:
                logger.error(f"Chatbot failed to fetch info for {symbol} ({e})")
                return {
                    "text": f"I detected the ticker **{symbol}**, but I was unable to retrieve its market metrics at this moment. This might be due to a rate limit or because the symbol is invalid. Make sure it is formatted correctly (e.g. AAPL, TSLA, or RELIANCE.NS). Let me know if you would like me to answer general financial questions!",
                    "ticker": symbol,
                    "data": None
                }

        # General queries
        if "SUNIL" in message_clean or "DESIGNER" in message_clean or "CREATOR" in message_clean or "DEVELOPER" in message_clean or "CONTACT" in message_clean or "EMAIL" in message_clean or "ENQUIRY" in message_clean or "ENQUIRIES" in message_clean:
            text = (
                "**QuantumStock AI** was designed and developed by **SUNIL M C**.\n\n"
                "- **Developer Credits:** SUNIL M C\n"
                "- **Enquiries & Contact Email:** [sunilmc197@gmail.com](mailto:sunilmc197@gmail.com)\n\n"
                "QuantumStock AI is designed as a state-of-the-art predictive terminal combining time-series sequence neural networks (LSTM) with gradient boosted decision trees (XGBoost/LightGBM) to forecast price directions and deliver transparent, explainable SHAP metrics."
            )
        elif "RSI" in message_clean:
            text = (
                "**Relative Strength Index (RSI)** is a technical momentum oscillator that measures the speed and change of price movements.\n\n"
                "- **Oversold (< 30):** Suggests that the stock is currently undervalued or due for a positive trend reversal.\n"
                "- **Overbought (> 70):** Indicates the stock may be overvalued or due for a technical correction.\n\n"
                "QuantumStock AI feeds daily rolling RSI values directly into its LSTM and XGBoost models to weight short-term trend directions."
            )
        elif "MACD" in message_clean:
            text = (
                "**MACD (Moving Average Convergence Divergence)** is a trend-following momentum indicator showing the relationship between two moving averages of a stock's price.\n\n"
                "It consists of the MACD Line, Signal Line, and a Histogram (the difference between the two lines). "
                "A crossing of the MACD Line above the Signal Line is considered a **bullish crossover**, whereas crossing below is a **bearish crossover**."
            )
        elif "BOLLINGER" in message_clean or "BAND" in message_clean:
            text = (
                "**Bollinger Bands** are a volatility indicator consisting of three lines:\n"
                "- **Middle Band:** A simple moving average (typically 20-period).\n"
                "- **Upper Band:** Middle band plus 2 standard deviations.\n"
                "- **Lower Band:** Middle band minus 2 standard deviations.\n\n"
                "When a stock price touches or breaches the Lower Band, it is often viewed as technically oversold; touching the Upper Band represents overbought volatility."
            )
        elif "PE" in message_clean or "VALUATION" in message_clean or "RATIO" in message_clean:
            text = (
                "**Valuation Metrics (like Price-to-Earnings or P/E Ratio)** measure the current stock price relative to its per-share earnings.\n\n"
                "- **High P/E:** Can mean the stock is valued highly relative to earnings, expecting future growth.\n"
                "- **Low P/E:** May signify the stock is undervalued, or the company is facing structural head-winds.\n\n"
                "You can inspect current P/E Ratios, Market Cap, and dividend metrics under the **Fundamentals** card on the stock dashboard."
            )
        elif "PORTFOLIO" in message_clean or "OPTIMIZ" in message_clean:
            text = (
                "Our **Portfolio Optimizer** implements standard Markowitz Mean-Variance Optimization (MVO).\n\n"
                "It calculates the historical covariance and expected returns for standard equities over a 1-year window, then mathematically finds the optimal asset weights "
                "to match your preferred risk appetite (Conservative, Moderate, Aggressive) and capital budget."
            )
        elif "BACKTEST" in message_clean or "STRATEGY" in message_clean:
            text = (
                "The **Strategy Backtester** simulates technical trading rules over historical time horizons.\n"
                "For example, you can backtest a **Moving Average Crossover** or **RSI Reversal** strategy on AAPL or TSLA. "
                "The engine outputs performance parameters including **Total Return**, **Max Drawdown**, **Sharpe Ratio**, and a **Win-Rate order ledger**."
            )
        elif "LSTM" in message_clean or "NEURAL" in message_clean:
            text = (
                "**LSTM (Long Short-Term Memory)** is a specialized recurrent neural network architecture designed to model sequence dependencies.\n\n"
                "In QuantumStock AI, the PyTorch-based LSTM model reads rolling 60-day windows of close prices and technical indicators (RSI, MACD) to discover complex time-series sequence relationships."
            )
        elif "XGBOOST" in message_clean or "LIGHTGBM" in message_clean or "FOREST" in message_clean:
            text = (
                "QuantumStock AI uses **Gradient Boosted Decision Trees (XGBoost & LightGBM)** and **Random Forests** to handle tabular features.\n\n"
                "These models evaluate technical momentum indicators alongside macro data (interest rates, indices) to construct strong decision boundaries for buy/sell probabilities."
            )
        elif "PROPHET" in message_clean or "SEASONAL" in message_clean:
            text = (
                "**Prophet** is an open-source forecasting library developed by Meta, optimized for additive modeling of time series featuring strong seasonal effects.\n\n"
                "It models weekly, monthly, and yearly seasonal patterns to estimate the macro growth trajectory of stock prices."
            )
        elif "SAFEST" in message_clean or "SAFE" in message_clean:
            text = (
                "When looking for 'safe' assets, institutional investors generally favor low-beta dividend-paying equities, government bonds, or gold.\n\n"
                "**Examples of conservative equities:**\n"
                "- **Microsoft (MSFT)** or **Apple (AAPL)**: Massive balance sheets and reliable cash flows.\n"
                "- **TCS (TCS.NS)** or **HDFC Bank (HDFCBANK.NS)** (in India): Large-cap leaders in their respective sectors.\n"
                "- **Gold (GC=F)**: The traditional hedge against inflation and market uncertainty.\n\n"
                "You can use our **Portfolio Optimizer** to design a Conservative portfolio that targets minimizing variance while locking in stable returns."
            )
        elif "HOW" in message_clean and "ENSEMBLE" in message_clean:
            text = (
                "My **Multi-Model Ensemble Engine** operates in three phases:\n"
                "1. **Data Ingestion & Extraction**: Fetches 10 years of historical data and computes technical indicators (RSI, MACD, Bollinger Bands).\n"
                "2. **Training & Error Testing**: Feeds tabular and sequential data into 5 algorithms: **LSTM** (captures time sequence), **XGBoost** and **LightGBM** (boosted decision boundaries), **Random Forest** (ensemble bagging), and **Prophet** (seasonality trend analysis).\n"
                "3. **Weighted Voting**: Evaluates model performance on the last 30 days of trading data. The inverse-error performance determines each model's vote weighting, yielding a unified range prediction."
            )
        elif "SHAP" in message_clean or "EXPLAIN" in message_clean:
            text = (
                "I use **SHAP (SHapley Additive exPlanations)** to break down why my neural networks and gradient boosting models make a specific prediction.\n\n"
                "SHAP values assign an 'impact weight' to each feature (e.g. RSI, MACD, Volatility) showing whether that feature pushed the prediction higher or lower. "
                "This guarantees that every prediction is fully explainable rather than being a 'black box' output."
            )
        elif "HI" in message_clean or "HELLO" in message_clean or "HEY" in message_clean or "HELP" in message_clean or "GREET" in message_clean:
            text = (
                "Hello! I am your **QuantumStock AI Analyst Assistant**. I can answer general financial questions, technical indicators, and run detailed analyses for you.\n\n"
                "Try typing: \n"
                "- *Should I buy TSLA?*\n"
                "- *What is MACD?*\n"
                "- *How does the ML ensemble work?*\n"
                "- *Who designed this website?*\n\n"
                "Or enter any stock ticker (e.g. AAPL, NVDA, TCS.NS) to get real-time prediction probabilities!"
            )
        else:
            text = (
                "Hello! I am your **QuantumStock AI Financial Analyst**.\n\n"
                "You can ask me questions about specific stock symbols or request predictions, like:\n"
                "- *Should I buy AAPL?*\n"
                "- *Why is Tesla (TSLA) bullish?*\n"
                "- *What is the forecast for RELIANCE.NS?*\n"
                "- *How does the ML ensemble work?*\n\n"
                "Type a ticker symbol (e.g. MSFT, GOOGL, INFY.NS) to get a full AI-driven analysis!"
            )
            
        return {
            "text": text,
            "ticker": None,
            "data": None
        }
