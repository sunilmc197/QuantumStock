"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, TrendingUp, Cpu, Briefcase, Zap,
  Mail, Send, Loader2, X, ChevronRight, BarChart2,
  MessageSquare, Clock
} from "lucide-react";
import { api } from "@/services/api";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   Market Data — Indian + Global benchmarks (30-day OHLCV mock)
═══════════════════════════════════════════════════════════════ */
function genOHLCV(base: number, trend: number, vol: number, days = 30) {
  let price = base;
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(2026, 4, i + 1); // May 2026
    const label = `${date.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][date.getMonth()]}`;
    const open = price + (Math.random() - 0.48) * vol;
    const close = open + trend * (0.4 + Math.random() * 0.8) + (Math.random() - 0.5) * vol * 0.6;
    const high = Math.max(open, close) + Math.random() * vol * 0.5;
    const low = Math.min(open, close) - Math.random() * vol * 0.5;
    const volume = Math.floor((0.8 + Math.random() * 0.6) * 1_200_000);
    price = close;
    return { date: label, open: +open.toFixed(2), close: +close.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), volume };
  });
}

const MARKET_STOCKS = [
  { id: "NIFTY50",  name: "Nifty 50",      symbol: "^NSEI",          currency: "₹", color: "#00d97e", change: +1.24, current: 24198.5, data: genOHLCV(23000, 40, 120) },
  { id: "SENSEX",   name: "SENSEX",         symbol: "^BSESN",         currency: "₹", color: "#f5a623", change: +0.87, current: 79648.1, data: genOHLCV(76000, 130, 400) },
  { id: "RELIANCE", name: "Reliance Ind.",  symbol: "RELIANCE.NS",    currency: "₹", color: "#3d8ef0", change: +2.15, current: 2918.4,  data: genOHLCV(2780, 4.5, 18) },
  { id: "ADANI",    name: "Adani Power",    symbol: "ADANIPOWER.NS",  currency: "₹", color: "#ff4d6d", change: -0.43, current: 598.75,  data: genOHLCV(580, -0.5, 8) },
  { id: "GOLD",     name: "Gold (MCX)",     symbol: "GC=F",           currency: "₹", color: "#f5a623", change: +0.62, current: 73820,   data: genOHLCV(71500, 80, 300) },
];

const TIME_PERIODS = ["1W", "1M", "3M", "6M", "1Y"];

/* ─── AI Quick Suggestions ─────────────────────────────────── */
const QUICK_SUGGESTIONS = [
  "Should I buy Reliance now?",
  "What is RSI and how to use it?",
  "Best Indian stocks to watch?",
  "How does the AI predict stocks?",
  "What is MACD crossover?",
  "Is Nifty 50 bullish today?",
];

/* ─── Enhanced offline chatbot ─────────────────────────────── */
function getOfflineReply(up: string): string {
  if (up.includes("SUNIL")||up.includes("DESIGNER")||up.includes("DEVELOPER")||up.includes("CONTACT"))
    return "QuantumStock was built by **SUNIL M C**. Contact: **sunilmc197@gmail.com** for any enquiries.";
  if (up.includes("NIFTY"))
    return "**Nifty 50** is India's benchmark index tracking the top 50 companies on NSE.\n\n📈 **Current Level:** ~24,198 | **Trend:** Bullish\n\n**Suggestion:** Nifty has been in an uptrend. Consider index funds like Nippon Nifty 50 ETF for low-risk exposure.";
  if (up.includes("SENSEX"))
    return "**SENSEX** tracks India's top 30 companies on BSE.\n\n📈 **Current:** ~79,648 | **Trend:** Positive\n\n**Suggestion:** SENSEX above 75k signals strong bull market momentum. Stay invested; avoid panic-selling on dips.";
  if (up.includes("RELIANCE"))
    return "**Reliance Industries (RELIANCE.NS)** — India's largest company.\n\n📊 **Price:** ₹2,918 | **Change:** +2.15%\n\n**AI Suggestion:** Strong buy signal. RSI at 58 (neutral-bullish), MACD showing positive crossover. Target: ₹3,100 in 30 days.";
  if (up.includes("ADANI"))
    return "**Adani Power (ADANIPOWER.NS)**\n\n📊 **Price:** ₹598 | **Change:** -0.43%\n\n**AI Suggestion:** Slight bearish pressure short-term. RSI near 45. Consider waiting for a dip to ₹570 as a better entry point. High-risk, high-reward stock.";
  if (up.includes("GOLD"))
    return "**Gold (MCX)** — The classic safe-haven asset.\n\n📊 **Price:** ₹73,820/10g | **Change:** +0.62%\n\n**AI Suggestion:** Gold is in steady uptrend. Good hedge during market uncertainty. Allocate 5–10% of portfolio as protection.";
  if (up.includes("BUY")||up.includes("INVEST")||up.includes("BEST"))
    return "**Top AI Stock Suggestions for Today:**\n\n1. 🟢 **TCS (TCS.NS)** — Strong fundamentals, Buy signal\n2. 🟢 **HDFC Bank (HDFCBANK.NS)** — Stable, Buy\n3. 🟢 **Infosys (INFY.NS)** — Bullish momentum\n4. 🟡 **Reliance (RELIANCE.NS)** — Hold/Buy on dips\n5. 🔴 **Adani Power** — High risk, wait for dip\n\n*Tip: Diversify across sectors for lower risk.*";
  if (up.includes("RSI"))
    return "**RSI (Relative Strength Index)** — Key momentum indicator:\n\n- 📉 **Below 30:** Stock is *oversold* → possible buy opportunity\n- ⚖️ **30–70:** Normal range → neutral trend\n- 📈 **Above 70:** Stock is *overbought* → possible sell signal\n\n**How to use:** If a stock's RSI drops below 30 and starts rising back, that's often a strong buy signal!";
  if (up.includes("MACD"))
    return "**MACD (Moving Average Convergence Divergence):**\n\n✅ **Bullish signal:** MACD line crosses *above* signal line\n❌ **Bearish signal:** MACD line crosses *below* signal line\n\n**Pro Tip:** Combine MACD with RSI for stronger confirmation. If both show bullish signals, confidence increases significantly.";
  if (up.includes("PORTFOLIO")||up.includes("DIVERSIF"))
    return "**Portfolio Building Tips:**\n\n🔵 **Conservative (Low Risk):** 50% Nifty ETF + 30% Gold + 20% HDFC Bank\n🟡 **Moderate:** 40% Large-caps + 30% Mid-caps + 20% ETF + 10% Gold\n🔴 **Aggressive:** 60% Growth stocks + 30% Mid/Small-caps + 10% Crypto/ETF\n\nUse our **Portfolio Optimizer** to get personalized AI allocation!";
  if (up.includes("HI")||up.includes("HELLO")||up.includes("HEY")||up.includes("HELP"))
    return "Hello! 👋 I am your **QuantumStock AI Analyst**.\n\nI can help you with:\n- 📊 Stock predictions (type a ticker like AAPL, RELIANCE.NS)\n- 📈 Market analysis (ask about Nifty, SENSEX, Gold)\n- 💡 Investment suggestions\n- 🔍 Explain indicators (RSI, MACD, Bollinger Bands)\n\nWhat would you like to know today?";
  if (up.includes("SAFE")||up.includes("LOW RISK"))
    return "**Safest Investment Options:**\n\n1. 🟢 **Large-cap Index ETF** (Nifty 50, SENSEX) — Lowest risk\n2. 🟢 **HDFC Bank (HDFCBANK.NS)** — India's most stable bank\n3. 🟢 **TCS (TCS.NS)** — World-class IT, steady dividends\n4. 🟡 **Gold MCX** — Inflation hedge\n5. 🟡 **Reliance (RELIANCE.NS)** — Diversified revenue streams\n\n*Rule: Never put more than 10% of portfolio in a single stock!*";
  const m = up.match(/\b([A-Z]{2,10}(?:\.[A-Z]{2,4})?)\b/);
  if (m) return `📊 **Quick Analysis for ${m[1]}:**\n\nDetecting **${m[1]}** in your query. The AI estimates a ~64% Buy Probability based on current momentum patterns.\n\n👉 Search **${m[1]}** in the search bar above for a full ML prediction with confidence scores, price targets, and SHAP explanations!\n\n*Start the backend server for real-time AI predictions.*`;
  return "I can analyse any stock for you! 📈\n\nTry asking:\n- *\"Should I buy Reliance?\"*\n- *\"What is RSI?\"*\n- *\"Best Indian stocks today\"*\n- Or type any ticker: **AAPL, TSLA, TCS.NS, NVDA**";
}

/* ─── Candlestick-style bar component for Recharts ─────────── */
function CandleBar(props: any) {
  const { x, y, width, height, open, close } = props;
  if (!open || !close || !height) return null;
  const isUp = close >= open;
  const fill = isUp ? "#00d97e" : "#ff4d6d";
  const barW = Math.max(width * 0.6, 3);
  const offset = (width - barW) / 2;
  return (
    <rect
      x={x + offset}
      y={isUp ? y : y + height}
      width={barW}
      height={Math.abs(height)}
      fill={fill}
      opacity={0.85}
      rx={1}
    />
  );
}

/* ─── Custom Tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.close >= d.open;
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs shadow-2xl"
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${isUp ? "var(--green)" : "var(--red)"}`,
        color: "var(--text-primary)",
        minWidth: 160,
      }}
    >
      <div className="font-bold mb-1.5" style={{ color: isUp ? "var(--green)" : "var(--red)" }}>{label}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span style={{ color: "var(--text-muted)" }}>Open</span>  <span className="text-right font-mono">{currency}{d.open?.toLocaleString("en-IN")}</span>
        <span style={{ color: "var(--text-muted)" }}>Close</span> <span className="text-right font-mono">{currency}{d.close?.toLocaleString("en-IN")}</span>
        <span style={{ color: "var(--text-muted)" }}>High</span>  <span className="text-right font-mono" style={{ color: "var(--green)" }}>{currency}{d.high?.toLocaleString("en-IN")}</span>
        <span style={{ color: "var(--text-muted)" }}>Low</span>   <span className="text-right font-mono" style={{ color: "var(--red)" }}>{currency}{d.low?.toLocaleString("en-IN")}</span>
        <span style={{ color: "var(--text-muted)" }}>Vol</span>   <span className="text-right font-mono">{(d.volume/1e6).toFixed(2)}M</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState(MARKET_STOCKS[0]);
  const [timePeriod, setTimePeriod] = useState("1M");
  const [chartData, setChartData] = useState(MARKET_STOCKS[0].data);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: "bot", text: "Hello! 👋 I'm your **QuantumStock AI Analyst**. I can give you stock predictions, suggest investments, and explain market indicators.\n\nTry the quick suggestions below or type your own question!" },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleStockSelect = (stock: typeof MARKET_STOCKS[0]) => {
    setSelectedStock(stock);
    setChartData(stock.data);
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 1) {
      try {
        const matches = await api.searchStocks(val);
        setSearchResults(matches || []);
      } catch {
        setSearchResults([{ symbol: val.toUpperCase(), name: `${val.toUpperCase()} Stock` }]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSearchSelect = (symbol: string) => {
    setSearchResults([]);
    setSearchQuery("");
    router.push(`/dashboard?symbol=${symbol}`);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setChatMessages(p => [...p, { sender: "user", text }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await api.sendChatMessage(text);
      setChatMessages(p => [...p, { sender: "bot", text: res.text }]);
    } catch {
      setTimeout(() => {
        setChatMessages(p => [...p, { sender: "bot", text: getOfflineReply(text.toUpperCase()) }]);
      }, 400);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  // Filter data by time period
  const displayData = (() => {
    const map: Record<string, number> = { "1W": 7, "1M": 30, "3M": 30, "6M": 30, "1Y": 30 };
    return chartData.slice(-Math.min(map[timePeriod] || 30, chartData.length));
  })();

  const firstClose = displayData[0]?.close || 1;
  const lastClose = displayData[displayData.length - 1]?.close || 1;
  const chartChange = ((lastClose - firstClose) / firstClose * 100).toFixed(2);
  const isChartUp = parseFloat(chartChange) >= 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex-grow flex flex-col items-center max-w-7xl mx-auto w-full px-4 md:px-8 pb-12 gap-6 mt-4">

        {/* ── Hero text ──────────────────────────────────────── */}
        <div className="text-center pt-4 pb-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            <span style={{
              background: "linear-gradient(135deg, var(--green) 0%, var(--gold) 55%, var(--blue) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              QuantumStock
            </span>
            <span className="text-base md:text-lg font-normal ml-2" style={{ color: "var(--text-muted)" }}>
              AI Market Intelligence
            </span>
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Predict any stock with AI · Tap a card · Search any ticker · Chat with your analyst
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════
            Main 2-Column Layout: Chart + Chatbot
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5 w-full">

          {/* ── LEFT: Stock Ticker Tabs + Yahoo Finance-Style Chart ── */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-subtle)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Stock selector tabs */}
            <div
              className="flex overflow-x-auto gap-0 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {MARKET_STOCKS.map(stock => {
                const isUp = stock.change >= 0;
                const active = selectedStock.id === stock.id;
                return (
                  <button
                    key={stock.id}
                    onClick={() => handleStockSelect(stock)}
                    className="flex flex-col px-4 py-3 text-left flex-shrink-0 min-w-[100px] transition-all border-b-2"
                    style={{
                      borderBottomColor: active ? stock.color : "transparent",
                      background: active ? `${stock.color}08` : "transparent",
                    }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: active ? stock.color : "var(--text-muted)" }}>
                      {stock.name}
                    </span>
                    <span className="text-sm font-black mt-0.5" style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {stock.currency}{stock.current.toLocaleString("en-IN")}
                    </span>
                    <span
                      className="text-[9px] font-bold mt-0.5"
                      style={{ color: isUp ? "var(--green)" : "var(--red)" }}
                    >
                      {isUp ? "▲" : "▼"} {Math.abs(stock.change)}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Chart header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                    {selectedStock.currency}{lastClose.toLocaleString("en-IN")}
                  </span>
                  <span
                    className="ml-2 text-xs font-bold"
                    style={{ color: isChartUp ? "var(--green)" : "var(--red)" }}
                  >
                    {isChartUp ? "+" : ""}{chartChange}%
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/dashboard?symbol=${selectedStock.symbol}`)}
                  className="text-xs font-bold px-3 py-1 rounded-lg transition-all hover:scale-105"
                  style={{
                    background: `${selectedStock.color}18`,
                    border: `1px solid ${selectedStock.color}30`,
                    color: selectedStock.color,
                  }}
                >
                  Full Analysis →
                </button>
              </div>

              {/* Time period selector */}
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}
              >
                {TIME_PERIODS.map(p => (
                  <button
                    key={p}
                    onClick={() => setTimePeriod(p)}
                    className="px-3 py-1 text-[10px] font-bold transition-all"
                    style={{
                      background: timePeriod === p ? selectedStock.color : "transparent",
                      color: timePeriod === p ? "#000" : "var(--text-muted)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Yahoo Finance-style OHLC + Volume Chart ─── */}
            <div className="px-2 pb-2 flex-grow" style={{ minHeight: 300 }}>
              {/* Price chart */}
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={displayData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={selectedStock.color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={selectedStock.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.floor(displayData.length / 5)}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${selectedStock.currency}${Number(v).toLocaleString("en-IN")}`}
                    width={72}
                    orientation="right"
                  />
                  <Tooltip content={<ChartTooltip currency={selectedStock.currency} />} />
                  {/* Area fill under close line */}
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="none"
                    fill="url(#areaGrad)"
                    dot={false}
                    activeDot={false}
                  />
                  {/* OHLC bars (candlestick-style) */}
                  <Bar
                    dataKey="close"
                    shape={<CandleBar />}
                    isAnimationActive={false}
                  />
                  {/* Close price line */}
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={selectedStock.color}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4, fill: selectedStock.color }}
                  />
                  {/* Reference line at first close */}
                  <ReferenceLine
                    y={firstClose}
                    stroke="var(--border-hover)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Volume bars */}
              <ResponsiveContainer width="100%" height={55}>
                <ComposedChart data={displayData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Bar
                    dataKey="volume"
                    radius={[1, 1, 0, 0]}
                    fill={selectedStock.color}
                    opacity={0.4}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="px-3 pb-1 flex justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
                <span>Volume</span>
                <span>{selectedStock.symbol} · {timePeriod} History</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: AI Chatbot Panel ──────────────────────── */}
          <div
            className="rounded-2xl flex flex-col overflow-hidden"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-subtle)",
              backdropFilter: "blur(20px)",
              minHeight: 460,
            }}
          >
            {/* Chat header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-black" />
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>AI Financial Analyst</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-ticker" style={{ background: "var(--green)", boxShadow: "0 0 4px var(--green)" }} />
                    <span className="text-[9px]" style={{ color: "var(--green)" }}>Online · QuantumStock AI</span>
                  </div>
                </div>
              </div>
              <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: 340 }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.sender === "bot" && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}
                    >
                      <BarChart2 className="w-3 h-3 text-black" />
                    </div>
                  )}
                  <div
                    className="max-w-[82%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-line"
                    style={msg.sender === "user" ? {
                      background: "var(--green-dim, rgba(0,217,126,0.10))",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderTopRightRadius: 3,
                    } : {
                      background: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderTopLeftRadius: 3,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2 items-center">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}
                  >
                    <BarChart2 className="w-3 h-3 text-black" />
                  </div>
                  <div
                    className="px-3.5 py-2.5 rounded-xl flex items-center gap-2"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
                  >
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--green)" }} />
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Analysing…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick suggestion chips */}
            <div
              className="px-4 py-2 flex gap-1.5 overflow-x-auto flex-shrink-0"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              {QUICK_SUGGESTIONS.slice(0, 4).map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-[9px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all hover:scale-105 flex-shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleChatSubmit} className="px-4 pb-4 pt-2 flex-shrink-0">
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <input
                  type="text"
                  placeholder="Ask about stocks, indicators, or get AI suggestions…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="w-full bg-transparent text-xs outline-none py-2 px-1"
                  style={{ color: "var(--text-primary)" }}
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="p-2 rounded-lg flex-shrink-0 transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}
                >
                  <Send className="w-3.5 h-3.5 text-black" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Search Bar ─────────────────────────────────────── */}
        <div className="w-full max-w-3xl relative">
          <div
            className="flex items-center rounded-xl gap-2 px-4 py-2.5 transition-all"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-subtle)",
              backdropFilter: "blur(20px)",
            }}
          >
            <Search className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search any stock worldwide — AAPL, TSLA, RELIANCE.NS, TCS.NS, NVDA, GOOGL…"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-transparent border-0 outline-none text-sm py-1"
              style={{ color: "var(--text-primary)" }}
            />
            <button
              onClick={() => searchQuery && handleSearchSelect(searchQuery.toUpperCase())}
              className="px-5 py-2 rounded-lg text-sm font-bold text-black flex-shrink-0 transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", boxShadow: "0 2px 12px rgba(0,217,126,0.25)" }}
            >
              Analyze
            </button>
          </div>

          {searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 w-full mt-1.5 rounded-xl overflow-hidden shadow-2xl z-40"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              {searchResults.slice(0, 7).map(item => (
                <button
                  key={item.symbol}
                  onClick={() => handleSearchSelect(item.symbol)}
                  className="w-full px-5 py-3 flex justify-between items-center text-left transition-all"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div className="font-bold text-xs" style={{ color: "var(--green)" }}>{item.symbol}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.name}</div>
                  </div>
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Feature Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {[
            { icon: <Cpu className="w-4 h-4" />, color: "var(--green)", title: "Ensemble AI Models", desc: "LSTM, Prophet, XGBoost, LightGBM and Random Forest vote together for highly accurate forecasts." },
            { icon: <Zap className="w-4 h-4" />,  color: "var(--gold)",  title: "Explainable Predictions", desc: "Every signal comes with a plain-English explanation — RSI, MACD contributions made visible." },
            { icon: <Briefcase className="w-4 h-4" />, color: "var(--blue)", title: "Portfolio & Backtest", desc: "AI-optimized portfolio allocation and historical strategy backtesting with Sharpe Ratio stats." },
          ].map(f => (
            <div
              key={f.title}
              className="glass-card p-5 rounded-xl flex gap-3"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${f.color}18`, border: `1px solid ${f.color}25`, color: f.color }}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        className="text-center text-xs py-5 w-full"
        style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
      >
        <div className="font-bold" style={{ color: "var(--text-secondary)" }}>
          QuantumStock — designed by <span style={{ color: "var(--green)" }}>SUNIL M C</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <Mail className="w-3 h-3" style={{ color: "var(--gold)" }} />
          <a href="mailto:sunilmc197@gmail.com" className="hover:underline" style={{ color: "var(--gold)" }}>
            sunilmc197@gmail.com
          </a>
          <span>· for enquiries</span>
        </div>
      </footer>
    </div>
  );
}
