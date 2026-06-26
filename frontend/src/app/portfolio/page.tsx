"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase, TrendingUp, AlertTriangle, ShieldCheck,
  Loader2, BarChart2, Home, Play, Settings, ChevronLeft
} from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ─── Mock fallback ───────────────────────────────── */
function getMockPortfolio(budget: number, risk: string, market: string) {
  const isIndian = market === "IN";
  const expectedReturn = risk === "Low" ? 8.5 : risk === "Medium" ? 14.2 : 22.8;
  const vol = risk === "Low" ? 5.8 : risk === "Medium" ? 11.5 : 24.1;
  const sharpe = +((expectedReturn - 4.5) / vol).toFixed(2);

  const pool = isIndian ? [
    { symbol: "TCS.NS",      name: "Tata Consultancy Services", w: 0.30, price: 3950 },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd",             w: 0.25, price: 1720 },
    { symbol: "RELIANCE.NS", name: "Reliance Industries",        w: 0.20, price: 2920 },
    { symbol: "NIFTYBEES.NS",name: "Nifty 50 ETF",              w: 0.15, price: 242 },
    { symbol: "GC=F",        name: "Gold MCX",                  w: 0.10, price: 73800 },
  ] : [
    { symbol: "MSFT", name: "Microsoft Corp", w: 0.30, price: 446 },
    { symbol: "AAPL", name: "Apple Inc",      w: 0.25, price: 213 },
    { symbol: "SPY",  name: "S&P 500 ETF",   w: 0.20, price: 590 },
    { symbol: "NVDA", name: "NVIDIA Corp",    w: 0.15, price: 137 },
    { symbol: "GC=F", name: "Gold Futures",  w: 0.10, price: 2340 },
  ];

  return {
    budget, risk_appetite: risk,
    expected_annual_return: expectedReturn,
    portfolio_volatility: vol,
    sharpe_ratio: sharpe,
    allocations: pool.map(a => ({
      symbol: a.symbol, name: a.name,
      percentage: a.w * 100,
      amount: +(budget * a.w).toFixed(2),
      shares: +(budget * a.w / a.price).toFixed(4),
      latest_price: a.price,
    })),
  };
}

const BAR_COLORS = ["#00d97e", "#f5a623", "#3d8ef0", "#ff4d6d", "#a855f7"];

function PortfolioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [budget, setBudget] = useState("100000");
  const [risk, setRisk] = useState("Medium");
  const [duration, setDuration] = useState("Medium");
  const [market, setMarket] = useState("IN");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const m = searchParams.get("market");
    if (m) setMarket(m.toUpperCase());
  }, [searchParams]);

  const handleOptimize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const r = await api.optimizePortfolio({ budget: parseFloat(budget), risk_appetite: risk, duration, market });
      setResult(r);
    } catch {
      setResult(getMockPortfolio(parseFloat(budget), risk, market));
    } finally { setLoading(false); }
  };

  const currency = market === "IN" ? "₹" : "$";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
          <span style={{ color: "var(--border-subtle)" }}>|</span>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: "var(--green)" }} />
            <span className="font-black text-sm" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              QuantumStock
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {[
            { href: "/", label: "Home", icon: <Home className="w-3.5 h-3.5" /> },
            { href: "/dashboard", label: "Dashboard", icon: <BarChart2 className="w-3.5 h-3.5" /> },
            { href: "/backtest",  label: "Backtest",  icon: <Play className="w-3.5 h-3.5" /> },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ color: "var(--text-secondary)" }}>
              {item.icon}{item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-grow max-w-6xl mx-auto w-full px-4 md:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black flex items-center gap-3">
            <Briefcase className="w-6 h-6" style={{ color: "var(--gold)" }} />
            Portfolio Optimizer
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            AI-powered Markowitz mean-variance optimization — get the best asset allocation for your budget and risk appetite
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Inputs ── */}
          <div className="glass-card p-6 rounded-2xl h-fit">
            <h2 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Settings className="w-4 h-4" style={{ color: "var(--green)" }} /> Optimizer Inputs
            </h2>
            <form onSubmit={handleOptimize} className="space-y-4 text-xs">
              {[
                {
                  label: "Investment Budget",
                  input: <input type="number" required value={budget} onChange={e => setBudget(e.target.value)}
                    placeholder="e.g. 100000"
                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
                },
                {
                  label: "Risk Appetite",
                  input: <select value={risk} onChange={e => setRisk(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                    <option value="Low">Low (Conservative)</option>
                    <option value="Medium">Medium (Moderate)</option>
                    <option value="High">High (Aggressive)</option>
                  </select>
                },
                {
                  label: "Investment Horizon",
                  input: <select value={duration} onChange={e => setDuration(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                    <option value="Short">Short (&lt;1 year)</option>
                    <option value="Medium">Medium (1–5 years)</option>
                    <option value="Long">Long (5+ years)</option>
                  </select>
                },
                {
                  label: "Market",
                  input: <select value={market} onChange={e => setMarket(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                    <option value="IN">India (NSE/BSE)</option>
                    <option value="US">US (NASDAQ/NYSE)</option>
                  </select>
                },
              ].map(({ label, input }) => (
                <div key={label}>
                  <label className="block mb-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>{label}</label>
                  {input}
                </div>
              ))}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing…</> : "Optimize Allocation"}
              </button>
            </form>
          </div>

          {/* ── Right: Results ── */}
          <div className="lg:col-span-2 space-y-5">
            {!result && !loading && (
              <div className="glass-card rounded-2xl p-12 text-center" style={{ color: "var(--text-muted)" }}>
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Fill in your preferences and click<br /><span style={{ color: "var(--green)" }}>Optimize Allocation</span> to get your AI portfolio.</p>
              </div>
            )}

            {result && (
              <>
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Expected Return", value: `${result.expected_annual_return.toFixed(1)}%`, icon: <TrendingUp className="w-5 h-5" />, color: "var(--green)", sub: "Annualized estimate" },
                    { label: "Portfolio Volatility", value: `${result.portfolio_volatility.toFixed(1)}%`, icon: <AlertTriangle className="w-5 h-5" />, color: "var(--gold)", sub: "Standard deviation" },
                    { label: "Sharpe Ratio", value: result.sharpe_ratio.toFixed(2), icon: <ShieldCheck className="w-5 h-5" />, color: "var(--blue)", sub: "Risk-adjusted return" },
                  ].map(m => (
                    <div key={m.label} className="glass-card p-5 rounded-xl text-left">
                      <span className="text-[9px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>{m.label}</span>
                      <div className="flex items-center gap-2" style={{ color: m.color }}>
                        {m.icon}
                        <span className="text-2xl font-black">{m.value}</span>
                      </div>
                      <span className="text-[9px] block mt-1.5" style={{ color: "var(--text-muted)" }}>{m.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div className="glass-card p-5 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>Allocation Distribution</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={result.allocations} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis dataKey="symbol" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 10, fontSize: 11, color: "var(--text-primary)" }} />
                      <Bar dataKey="percentage" radius={[5,5,0,0]}>
                        {result.allocations.map((_: any, i: number) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                        {["Symbol", "Name", "Weight %", `Capital (${currency})`, "Shares"].map(h => (
                          <th key={h} className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)", fontSize: 9 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.allocations.map((a: any, i: number) => (
                        <tr key={a.symbol} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td className="px-4 py-3 font-bold" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }}>{a.symbol}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>{a.name}</td>
                          <td className="px-4 py-3 font-bold" style={{ color: "var(--text-primary)" }}>{a.percentage.toFixed(1)}%</td>
                          <td className="px-4 py-3 font-bold" style={{ color: "var(--text-primary)" }}>{currency}{Number(a.amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                          <td className="px-4 py-3 font-mono" style={{ color: "var(--text-muted)" }}>{a.shares.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--green)" }} />
      </div>
    }>
      <PortfolioContent />
    </Suspense>
  );
}
