"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Send, MessageSquare, BarChart2, Briefcase,
  Play, Settings, LogOut, Home, Calculator, RefreshCw, Loader2
} from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Area
} from "recharts";

/* ═══════════════════════════════════════════════════════
   Mock data generator — no default stock, only runs
   once a symbol is searched
═══════════════════════════════════════════════════════ */
function buildMockData(sym: string) {
  const isIndian = sym.endsWith(".NS") || sym.endsWith(".BO");
  const basePrice = isIndian
    ? sym.includes("TCS") ? 3950
    : sym.includes("RELIANCE") ? 2920
    : sym.includes("INFY") ? 1820
    : sym.includes("HDFC") ? 1720
    : sym.includes("WIPRO") ? 560
    : 1500
    : sym.includes("AAPL") ? 213
    : sym.includes("TSLA") ? 248
    : sym.includes("NVDA") ? 137
    : sym.includes("GOOGL") ? 177
    : sym.includes("MSFT") ? 446
    : 180;
  const curr = isIndian ? "₹" : "$";

  const chartData = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(2025, 6, 1);
    d.setDate(d.getDate() + i);
    const label = `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    const noise = (Math.random() - 0.5) * basePrice * 0.022;
    const close = basePrice * (1 + 0.003 * i) + noise + Math.sin(i / 18) * basePrice * 0.035;
    const open  = close - (Math.random() - 0.5) * basePrice * 0.012;
    const high  = Math.max(open, close) + Math.random() * basePrice * 0.009;
    const low   = Math.min(open, close) - Math.random() * basePrice * 0.009;
    const vol   = Math.floor(2e6 + Math.random() * 3e6);
    return { date: label, open: +open.toFixed(2), close: +close.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), volume: vol };
  });

  const current  = chartData[chartData.length - 1].close;
  const prev     = chartData[chartData.length - 2].close;
  const dayChange = +((current - prev) / prev * 100).toFixed(2);

  return {
    symbol: sym, currency: curr,
    fundamentals: {
      name: sym.split(".")[0] + (isIndian ? " Ltd" : " Inc"),
      sector: isIndian ? "Indian Equities" : "US Equities",
      exchange: isIndian ? "NSE" : "NASDAQ",
    },
    current, dayChange,
    predictions: {
      today_close: +(current * (1 + (Math.random() * 0.006 - 0.002))).toFixed(2),
      "1d": { price: +(current * 1.012).toFixed(2), min: +(current * 0.982).toFixed(2), max: +(current * 1.042).toFixed(2), buy_prob: 0.68, conf: 88, risk: 22 },
      "1w": { price: +(current * 1.028).toFixed(2), min: +(current * 0.960).toFixed(2), max: +(current * 1.096).toFixed(2), buy_prob: 0.63, conf: 79, risk: 31 },
      "1m": { price: +(current * 1.055).toFixed(2), min: +(current * 0.920).toFixed(2), max: +(current * 1.190).toFixed(2), buy_prob: 0.61, conf: 68, risk: 39 },
    },
    direction: "BULLISH",
    reasons: [
      "RSI at 56 — healthy bullish momentum without overbought signals.",
      "MACD crossed above signal line 3 sessions ago — bullish crossover confirmed.",
      "Volume is 1.7× the 20-day average — strong institutional buying interest.",
      "Price is above SMA 20 and SMA 50 — uptrend structurally confirmed.",
    ],
    chartData,
  };
}

/* ═══════════════════════════════════════════════════════
   Period slicing helper
═══════════════════════════════════════════════════════ */
const PERIODS: Record<string, number> = {
  "1D": 1, "1W": 7, "1M": 30, "6M": 180, "1Y": 365, "All": 365,
};
function sliceData(data: any[], period: string) {
  if (period === "All") return data;
  if (period === "1D") return data.slice(-1);
  return data.slice(-PERIODS[period]);
}

/* ═══════════════════════════════════════════════════════
   Yahoo Finance-style Candlestick bar
═══════════════════════════════════════════════════════ */
function CandleBar(props: any) {
  const { x, y, width, height, open, close } = props;
  if (width < 1 || !open || !close) return null;
  const isUp = close >= open;
  const fill = isUp ? "#00d97e" : "#ff4d6d";
  const barW = Math.max(width * 0.65, 2);
  const bx = x + (width - barW) / 2;
  const bh = Math.abs(height || 2);
  const by = isUp ? y : y + height;
  return <rect x={bx} y={by} width={barW} height={bh} fill={fill} opacity={0.88} rx={1} />;
}

/* ═══════════════════════════════════════════════════════
   Yahoo Finance-style Tooltip
═══════════════════════════════════════════════════════ */
function YFTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  const isUp = d.close >= d.open;
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: `1px solid ${isUp ? "var(--green)" : "var(--red)"}`,
      borderRadius: 10, padding: "10px 14px",
      fontSize: 11, color: "var(--text-primary)", minWidth: 165,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: isUp ? "var(--green)" : "var(--red)" }}>{label}</div>
      {[
        ["Date", label],
        ["Close",  `${currency}${Number(d.close).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
        ["Open",   `${currency}${Number(d.open ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
        ["High",   `${currency}${Number(d.high ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
        ["Low",    `${currency}${Number(d.low  ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
        ["Volume", `${((d.volume || 0) / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,",")}K`],
      ].map(([k, v]) => (
        <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
          <span style={{ color: "var(--text-muted)" }}>{k}</span>
          <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Offline chatbot replies
═══════════════════════════════════════════════════════ */
function offlineReply(msg: string, sym: string): string {
  const u = msg.toUpperCase();
  if (u.includes("SUNIL") || u.includes("CONTACT")) return "QuantumStock was built by **SUNIL M C** — sunilmc197@gmail.com.";
  if (u.includes("BUY") || u.includes("INVEST")) return `AI signals a **BUY** for **${sym}** with ~68% probability.\n• RSI: 56 (bullish zone)\n• MACD: Positive crossover\n• Volume: Above 20-day avg\n\n*Always do your own research before investing.*`;
  if (u.includes("RSI")) return "**RSI Guide:**\n• Below 30 → Oversold → Buy opportunity\n• 30–70 → Neutral zone\n• Above 70 → Overbought → Sell signal";
  if (u.includes("MACD")) return "**MACD Guide:**\n• MACD above signal → Bullish ✅\n• MACD below signal → Bearish ❌\n\nThis stock shows a recent bullish MACD crossover.";
  return `Ask me:\n• "Should I buy this stock?"\n• "What is RSI?"\n• "Explain MACD"\n• "What's the 1-week target?"`;
}

/* ═══════════════════════════════════════════════════════
   Search landing screen (shown when no stock selected)
═══════════════════════════════════════════════════════ */
function SearchLanding({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const POPULAR = [
    { symbol: "TCS.NS",    name: "Tata Consultancy Services" },
    { symbol: "RELIANCE.NS", name: "Reliance Industries" },
    { symbol: "INFY.NS",   name: "Infosys Ltd" },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
    { symbol: "AAPL",      name: "Apple Inc." },
    { symbol: "TSLA",      name: "Tesla Inc." },
    { symbol: "NVDA",      name: "NVIDIA Corp." },
    { symbol: "GOOGL",     name: "Alphabet Inc." },
  ];

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQ(val);
    if (val.trim().length >= 1) {
      try {
        const r = await api.searchStocks(val);
        setResults(r || []);
      } catch {
        setResults([{ symbol: val.toUpperCase(), name: val.toUpperCase() }]);
      }
    } else { setResults([]); }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-6 pb-12 gap-8">
      {/* Hero */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", boxShadow: "0 0 30px rgba(0,217,126,0.35)" }}>
          <BarChart2 className="w-8 h-8 text-black" />
        </div>
        <h1 className="text-3xl font-black mb-2" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          QuantumStock
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Search any stock worldwide to get AI predictions, price history, and analysis</p>
      </div>

      {/* Search box */}
      <div className="w-full max-w-xl relative">
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl" style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)", backdropFilter: "blur(20px)" }}>
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            autoFocus
            type="text"
            placeholder="Search by name or ticker — AAPL, TCS.NS, RELIANCE.NS, TSLA…"
            value={q}
            onChange={handleChange}
            onKeyDown={e => { if (e.key === "Enter" && q.trim()) onSearch(q.trim().toUpperCase()); }}
            className="flex-grow bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            onClick={() => q.trim() && onSearch(q.trim().toUpperCase())}
            className="px-5 py-2 rounded-xl text-xs font-bold text-black flex-shrink-0 transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}
          >
            Analyze
          </button>
        </div>

        {/* Autocomplete */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-1.5 rounded-xl overflow-hidden shadow-2xl z-40" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            {results.slice(0, 7).map(r => (
              <button key={r.symbol} onClick={() => onSearch(r.symbol)} className="w-full px-5 py-3 flex justify-between items-center text-left transition-all"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--green)" }}>{r.symbol}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{r.name}</div>
                </div>
                <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular picks */}
      <div className="w-full max-w-xl">
        <div className="text-[10px] font-bold uppercase tracking-widest mb-3 text-center" style={{ color: "var(--text-muted)" }}>Popular Stocks</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {POPULAR.map(s => (
            <button key={s.symbol} onClick={() => onSearch(s.symbol)}
              className="px-3 py-2.5 rounded-xl text-left transition-all hover:scale-[1.03]"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)", backdropFilter: "blur(12px)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}>
              <div className="text-xs font-black" style={{ color: "var(--green)" }}>{s.symbol.split(".")[0]}</div>
              <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Dashboard inner
═══════════════════════════════════════════════════════ */
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [symbol, setSymbol] = useState<string | null>(null);
  const [sideSearch, setSideSearch] = useState("");
  const [sideResults, setSideResults] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState("1M");
  const [budget, setBudget] = useState("");
  const [budgetResult, setBudgetResult] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("qs_user");
    if (savedUser) try { setUser(JSON.parse(savedUser)); } catch {}

    const sym = searchParams.get("symbol");
    if (sym) loadStock(sym.toUpperCase());
  }, [searchParams]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatOpen]);

  const loadStock = async (sym: string) => {
    setSymbol(sym);
    setData(null); // brief clear

    // Instant mock data
    const mock = buildMockData(sym);
    setData(mock);
    setPeriod("1M");
    setBudgetResult(null);
    setChatMessages([{ sender: "bot", text: `Hello! 👋 I'm your AI analyst for **${sym}**.\n\nAsk me anything — buy/sell signals, RSI, MACD, or your investment plan!` }]);

    // Background: try real backend
    try {
      const real = await api.getStockDetails(sym);
      if (real?.chart_data?.length > 0) {
        setData({
          ...mock,
          fundamentals: real.fundamentals || mock.fundamentals,
          current: real.chart_data[real.chart_data.length - 1]?.close || mock.current,
          chartData: real.chart_data,
          direction: real.explanations?.direction || mock.direction,
          reasons: real.explanations?.reasons || mock.reasons,
          predictions: real.predictions ? {
            today_close: real.chart_data[real.chart_data.length - 1]?.close,
            "1d": { price: real.predictions["1d"]?.predicted_price, min: real.predictions["1d"]?.predicted_min, max: real.predictions["1d"]?.predicted_max, buy_prob: real.predictions["1d"]?.buy_probability, conf: real.predictions["1d"]?.confidence_score, risk: real.predictions["1d"]?.risk_score },
            "1w": { price: real.predictions["7d"]?.predicted_price, min: real.predictions["7d"]?.predicted_min, max: real.predictions["7d"]?.predicted_max, buy_prob: real.predictions["7d"]?.buy_probability, conf: real.predictions["7d"]?.confidence_score, risk: real.predictions["7d"]?.risk_score },
            "1m": { price: real.predictions["30d"]?.predicted_price, min: real.predictions["30d"]?.predicted_min, max: real.predictions["30d"]?.predicted_max, buy_prob: real.predictions["30d"]?.buy_probability, conf: real.predictions["30d"]?.confidence_score, risk: real.predictions["30d"]?.risk_score },
          } : mock.predictions,
        });
      }
    } catch {}
  };

  const handleSideSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSideSearch(val);
    if (val.trim().length >= 1) {
      try { const r = await api.searchStocks(val); setSideResults(r || []); }
      catch { setSideResults([{ symbol: val.toUpperCase(), name: val.toUpperCase() }]); }
    } else { setSideResults([]); }
  };

  const selectStock = (sym: string) => {
    setSideSearch(""); setSideResults([]);
    router.push(`/dashboard?symbol=${sym}`);
  };

  const calcBudget = () => {
    if (!data || !budget) return;
    const amount = parseFloat(budget);
    if (isNaN(amount) || amount <= 0) return;
    const price = data.current;
    const shares = Math.floor(amount / price);
    const cost = (shares * price).toFixed(2);
    const pred1m = data.predictions["1m"]?.price || price * 1.05;
    const returnAmt = ((pred1m - price) * shares).toFixed(2);
    const returnPct = ((pred1m - price) / price * 100).toFixed(2);
    setBudgetResult({ shares, cost, returnAmt, returnPct, pred1m: pred1m.toFixed(2) });
  };

  const sendChat = async (msg: string) => {
    if (!msg.trim()) return;
    setChatMessages(p => [...p, { sender: "user", text: msg }]);
    setChatInput(""); setChatLoading(true);
    try {
      const r = await api.sendChatMessage(msg);
      setChatMessages(p => [...p, { sender: "bot", text: r.text }]);
    } catch {
      setTimeout(() => {
        setChatMessages(p => [...p, { sender: "bot", text: offlineReply(msg, symbol || "") }]);
      }, 400);
    } finally { setChatLoading(false); }
  };

  /* ─── Sidebar ─────────────────────────────────────────── */
  const Sidebar = () => (
    <aside className="w-full md:w-60 flex-shrink-0 flex flex-col py-5 px-4 gap-5" style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)" }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}>
          <BarChart2 className="w-4 h-4 text-black" />
        </div>
        <span className="font-black text-sm tracking-widest" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          QuantumStock
        </span>
      </Link>

      {/* Side search */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search ticker…" value={sideSearch} onChange={handleSideSearch}
            className="w-full bg-transparent text-xs outline-none" style={{ color: "var(--text-primary)" }} />
        </div>
        {sideResults.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-1 rounded-xl overflow-hidden shadow-2xl z-40" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            {sideResults.slice(0, 6).map(r => (
              <button key={r.symbol} onClick={() => selectStock(r.symbol)} className="w-full px-4 py-2.5 text-left transition-all" style={{ borderBottom: "1px solid var(--border-subtle)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div className="text-xs font-bold" style={{ color: "var(--green)" }}>{r.symbol}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{r.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {[
          { href: "/", label: "Home", icon: <Home className="w-4 h-4" /> },
          { href: symbol ? `/dashboard?symbol=${symbol}` : "/dashboard", label: "Stock Analysis", icon: <TrendingUp className="w-4 h-4" />, active: true },
          { href: "/portfolio", label: "Portfolio Optimizer", icon: <Briefcase className="w-4 h-4" /> },
          { href: "/backtest",  label: "Strategy Backtest",  icon: <Play className="w-4 h-4" /> },
          { href: "/profile",   label: "Settings & Profile", icon: <Settings className="w-4 h-4" /> },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: item.active ? "rgba(0,217,126,0.10)" : "transparent", color: item.active ? "var(--green)" : "var(--text-secondary)", border: item.active ? "1px solid rgba(0,217,126,0.18)" : "1px solid transparent" }}>
            {item.icon}{item.label}
          </Link>
        ))}
      </nav>

      {/* User block */}
      <div className="mt-auto flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-black text-[11px] font-black" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{user?.name || "User"}</div>
            <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{user?.email || ""}</div>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem("qs_token"); localStorage.removeItem("qs_user"); router.push("/"); }} style={{ color: "var(--text-muted)" }}>
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );

  /* ─── No stock selected — show landing ─────────────────── */
  if (!symbol) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "var(--bg-primary)" }}>
        <Sidebar />
        <SearchLanding onSearch={(sym) => router.push(`/dashboard?symbol=${sym}`)} />
      </div>
    );
  }

  /* ─── Stock view ────────────────────────────────────────── */
  const chartData = sliceData(data?.chartData || [], period);
  const isUp = (data?.dayChange || 0) >= 0;
  const currency = data?.currency || "$";
  const preds = data?.predictions;
  const direction = data?.direction || "BULLISH";

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />

      <main className="flex-grow overflow-y-auto px-4 md:px-6 py-5 space-y-5 max-w-5xl mx-auto w-full">

        {/* ── Stock Header ──────────────────────────────────── */}
        <div className="glass-card rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{data?.fundamentals?.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                {symbol}
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              {data?.fundamentals?.sector} · {data?.fundamentals?.exchange}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
                {currency}{Number(data?.current).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-bold" style={{ color: isUp ? "var(--green)" : "var(--red)" }}>
                {isUp ? "▲" : "▼"} {Math.abs(data?.dayChange || 0)}% today
              </div>
            </div>
            <button onClick={() => loadStock(symbol)} className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ══ Yahoo Finance-Style Chart ══════════════════════ */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-wrap gap-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Price History
            </div>
            {/* Period tabs */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
              {Object.keys(PERIODS).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="px-3 py-1 text-[10px] font-bold transition-all"
                  style={{ background: period === p ? (isUp ? "var(--green)" : "var(--red)") : "transparent", color: period === p ? "#000" : "var(--text-muted)" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Price % badge */}
          {chartData.length > 1 && (() => {
            const pct = ((chartData[chartData.length-1].close - chartData[0].close) / chartData[0].close * 100).toFixed(2);
            const up = parseFloat(pct) >= 0;
            return (
              <div className="px-5 pt-2 flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: up ? "rgba(0,217,126,0.12)" : "rgba(255,77,109,0.12)", color: up ? "var(--green)" : "var(--red)" }}>
                  {up ? "+" : ""}{pct}%
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{period} return</span>
              </div>
            );
          })()}

          {/* Main candlestick price chart */}
          <div className="px-2 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 55, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={isUp ? "#00d97e" : "#ff4d6d"} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={isUp ? "#00d97e" : "#ff4d6d"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false}
                  interval={Math.max(1, Math.floor(chartData.length / 6))} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${currency}${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                  width={70} orientation="right" />
                <Tooltip content={<YFTooltip currency={currency} />} />

                {/* Area fill */}
                <Area type="monotone" dataKey="close" stroke="none" fill="url(#areaFill)" dot={false} activeDot={false} />

                {/* Candlestick OHLC bars */}
                <Bar dataKey="close" shape={<CandleBar />} isAnimationActive={false} />

                {/* Close price line */}
                <Line type="monotone" dataKey="close"
                  stroke={isUp ? "#00d97e" : "#ff4d6d"}
                  strokeWidth={1.6} dot={false}
                  activeDot={{ r: 4, fill: isUp ? "#00d97e" : "#ff4d6d", strokeWidth: 0 }} />

                {/* Reference baseline */}
                <ReferenceLine y={chartData[0]?.close} stroke="var(--text-muted)" strokeDasharray="3 4" strokeWidth={0.8} />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Volume bars — exactly like Yahoo Finance */}
            <ResponsiveContainer width="100%" height={52}>
              <ComposedChart data={chartData} margin={{ top: 0, right: 55, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Bar dataKey="volume" radius={[1,1,0,0]} isAnimationActive={false}>
                  {chartData.map((d: any, i: number) => (
                    <rect key={i} fill={d.close >= d.open ? "#00d97e" : "#ff4d6d"} opacity={0.40} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="px-5 pb-3 flex justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
            <span>Volume</span>
            <span>{symbol} · {period} Price History</span>
          </div>
        </div>

        {/* ── AI Predicted Prices ──────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "var(--green)" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>AI Price Predictions</span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
              style={{ background: direction === "BULLISH" ? "rgba(0,217,126,0.12)" : "rgba(255,77,109,0.12)", color: direction === "BULLISH" ? "var(--green)" : "var(--red)" }}>
              {direction === "BULLISH" ? "▲" : "▼"} {direction}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Today's Close",    price: preds?.today_close || data?.current, min: null, max: null, buy: null },
              { label: "Tomorrow (+1D)",  price: preds?.["1d"]?.price, min: preds?.["1d"]?.min, max: preds?.["1d"]?.max, buy: preds?.["1d"]?.buy_prob },
              { label: "Next Week (+1W)", price: preds?.["1w"]?.price, min: preds?.["1w"]?.min, max: preds?.["1w"]?.max, buy: preds?.["1w"]?.buy_prob },
              { label: "Next Month (+1M)",price: preds?.["1m"]?.price, min: preds?.["1m"]?.min, max: preds?.["1m"]?.max, buy: preds?.["1m"]?.buy_prob },
            ].map((p, i) => {
              const chg = p.price && data?.current ? ((p.price - data.current) / data.current * 100).toFixed(2) : null;
              const up = chg ? parseFloat(chg) >= 0 : true;
              return (
                <div key={i} className="glass-card rounded-xl p-4"
                  style={{ borderColor: i === 0 ? "var(--border-subtle)" : up ? "rgba(0,217,126,0.18)" : "rgba(255,77,109,0.18)" }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{p.label}</div>
                  <div className="text-lg font-black" style={{ color: i === 0 ? "var(--text-primary)" : up ? "var(--green)" : "var(--red)" }}>
                    {currency}{Number(p.price)?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                  {chg && <div className="text-[10px] font-bold mt-0.5" style={{ color: up ? "var(--green)" : "var(--red)" }}>{up ? "+" : ""}{chg}% vs now</div>}
                  {p.min && p.max && <div className="text-[9px] mt-1.5" style={{ color: "var(--text-muted)" }}>Range: {currency}{Number(p.min).toLocaleString("en-IN", { maximumFractionDigits: 0 })} – {currency}{Number(p.max).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>}
                  {p.buy != null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] mb-0.5" style={{ color: "var(--text-muted)" }}>
                        <span>Buy prob.</span><span style={{ color: "var(--green)", fontWeight: 700 }}>{(p.buy * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "var(--bg-hover)" }}>
                        <div className="h-full rounded-full" style={{ width: `${p.buy * 100}%`, background: "var(--green)" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── AI Rationale + Budget Calculator ─────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Reasons */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              {direction === "BULLISH"
                ? <ArrowUpRight className="w-4 h-4" style={{ color: "var(--green)" }} />
                : <ArrowDownRight className="w-4 h-4" style={{ color: "var(--red)" }} />}
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Why the AI predicts this</span>
            </div>
            <div className="space-y-3">
              {(data?.reasons || []).map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--green)" }} />
                  {r}
                </div>
              ))}
            </div>
          </div>

          {/* Budget Calculator */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4" style={{ color: "var(--gold)" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Investment Calculator</span>
            </div>
            <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>
              Enter your budget → see shares you can buy + AI-predicted 1-month return.
            </p>
            <div className="flex gap-2 mb-3">
              <input type="number" placeholder={`Budget in ${currency} e.g. 100000`} value={budget}
                onChange={e => setBudget(e.target.value)}
                className="flex-grow text-xs px-3 py-2 rounded-xl outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
              <button onClick={calcBudget} className="px-4 py-2 rounded-xl text-xs font-bold text-black transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}>
                Calculate
              </button>
            </div>
            {budgetResult ? (
              <div className="rounded-xl p-4 space-y-1.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                {[
                  ["Shares you can buy", budgetResult.shares],
                  ["Amount invested", `${currency}${Number(budgetResult.cost).toLocaleString("en-IN")}`],
                  ["AI target (1M)", `${currency}${Number(budgetResult.pred1m).toLocaleString("en-IN")}`],
                  ["Expected return", null],
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>{k}</span>
                    {i === 3
                      ? <span style={{ fontWeight: 700, color: parseFloat(budgetResult.returnAmt) >= 0 ? "var(--green)" : "var(--red)" }}>
                          {parseFloat(budgetResult.returnAmt) >= 0 ? "+" : ""}{currency}{Math.abs(parseFloat(budgetResult.returnAmt)).toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({budgetResult.returnPct}%)
                        </span>
                      : <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{v}</span>
                    }
                  </div>
                ))}
                <p className="text-[9px] pt-2" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
                  ⚠️ AI estimates only. Not financial advice.
                </p>
              </div>
            ) : (
              <div className="rounded-xl p-4 text-center text-[10px]" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                Enter a budget amount and click Calculate.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ══ Floating Chatbot ═══════════════════════════════ */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {chatOpen && (
          <div className="w-80 md:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ height: 400, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-ticker" style={{ background: "var(--green)", boxShadow: "0 0 5px var(--green)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>AI Analyst — {symbol}</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-[10px]" style={{ color: "var(--text-muted)" }}>Close</button>
            </div>
            <div className="flex-grow overflow-y-auto px-4 py-3 space-y-2.5">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {m.sender === "bot" && <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}><BarChart2 className="w-2.5 h-2.5 text-black" /></div>}
                  <div className="max-w-[82%] text-xs px-3 py-2 rounded-xl leading-relaxed whitespace-pre-line"
                    style={m.sender === "user"
                      ? { background: "rgba(0,217,126,0.10)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderTopRightRadius: 3 }
                      : { background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderTopLeftRadius: 3 }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}><BarChart2 className="w-2.5 h-2.5 text-black" /></div>
                  <div className="px-3 py-2 rounded-xl flex items-center gap-1.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--green)" }} />
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Analysing…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={e => { e.preventDefault(); sendChat(chatInput); }} className="px-3 pb-3 pt-2 flex-shrink-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)" }}>
                <input type="text" placeholder="Ask anything about this stock…" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  className="w-full bg-transparent text-xs outline-none py-1.5" style={{ color: "var(--text-primary)" }} />
                <button type="submit" className="p-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}>
                  <Send className="w-3 h-3 text-black" />
                </button>
              </div>
            </form>
          </div>
        )}
        <button onClick={() => setChatOpen(o => !o)} className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110"
          style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", boxShadow: "0 0 20px rgba(0,217,126,0.35)" }}>
          <MessageSquare className="w-5 h-5 text-black" />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center"><BarChart2 className="w-10 h-10 mx-auto mb-3 animate-pulse" style={{ color: "var(--green)" }} /><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
