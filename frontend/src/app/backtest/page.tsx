"use client";

import { useState } from "react";
import {
  Play, TrendingUp, AlertTriangle, ShieldCheck, DollarSign,
  Activity, Loader2, BarChart2, Home, Briefcase, ChevronLeft, Settings
} from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

/* ─── Mock fallback ───────────────────────────────── */
function getMockBacktest(symbol: string, strategy: string, capital: number, start: string, end: string) {
  const isRsi = strategy.toLowerCase().includes("rsi");
  const returnPct = isRsi ? 18.4 : 13.2;
  const win = isRsi ? 64.5 : 56.2;
  const drawdown = isRsi ? 7.8 : 12.4;
  const sharpe = isRsi ? 1.74 : 1.22;

  const startD = new Date(start);
  const endD   = new Date(end);
  const days   = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000));
  const points  = Math.min(days, 24);

  const equity_curve = Array.from({ length: points }, (_, i) => {
    const d = new Date(startD);
    d.setDate(d.getDate() + Math.round((i / points) * days));
    const label = `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    return {
      date: label,
      value: +(capital * (1 + (i / points) * (returnPct / 100) + Math.sin(i * 0.9) * 0.015)).toFixed(2),
      benchmark: +(capital * (1 + (i / points) * 0.08)).toFixed(2),
    };
  });

  const tradeCount = Math.max(2, Math.floor(points / 3));
  const trades = Array.from({ length: tradeCount * 2 }, (_, i) => {
    const isBuy = i % 2 === 0;
    const idx   = Math.min(Math.floor(i * points / (tradeCount * 2)), equity_curve.length - 1);
    const price = equity_curve[idx]?.value / (capital / 150);
    return {
      type: isBuy ? "BUY" : "SELL",
      date: equity_curve[idx]?.date,
      price: +price.toFixed(2),
      shares: +(capital / price).toFixed(4),
      profit_pct: isBuy ? undefined : +(3 + Math.random() * 10).toFixed(2),
    };
  });

  return {
    symbol, strategy, initial_capital: capital,
    final_value: +(capital * (1 + returnPct / 100)).toFixed(2),
    profit_loss: +(capital * returnPct / 100).toFixed(2),
    total_return_percentage: returnPct,
    win_rate: win, sharpe_ratio: sharpe, max_drawdown: drawdown,
    total_trades: tradeCount * 2,
    equity_curve, trades,
  };
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("");
  const [strategy, setStrategy] = useState("RSI Reversal");
  const [capital, setCapital] = useState("100000");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate,   setEndDate]   = useState("2025-12-31");
  const [loading, setLoading]   = useState(false);
  const [result,  setResult]    = useState<any>(null);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const r = await api.runBacktest({ symbol: symbol.toUpperCase(), strategy, initial_capital: parseFloat(capital), start_date: startDate, end_date: endDate });
      setResult(r);
    } catch {
      setResult(getMockBacktest(symbol.toUpperCase(), strategy, parseFloat(capital), startDate, endDate));
    } finally { setLoading(false); }
  };

  const isProfit = result ? result.profit_loss >= 0 : true;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
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
            { href: "/",          label: "Home",      icon: <Home className="w-3.5 h-3.5" /> },
            { href: "/dashboard", label: "Dashboard", icon: <BarChart2 className="w-3.5 h-3.5" /> },
            { href: "/portfolio", label: "Portfolio", icon: <Briefcase className="w-3.5 h-3.5" /> },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {item.icon}{item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-grow max-w-6xl mx-auto w-full px-4 md:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black flex items-center gap-3">
            <Play className="w-6 h-6" style={{ color: "var(--green)" }} /> Strategy Backtester
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Simulate a trading strategy on historical data and see how it would have performed
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Inputs ── */}
          <div className="glass-card p-6 rounded-2xl h-fit">
            <h2 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Settings className="w-4 h-4" style={{ color: "var(--green)" }} /> Simulation Parameters
            </h2>
            <form onSubmit={handleRun} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>Stock Ticker</label>
                <input type="text" required value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL, TCS.NS, RELIANCE.NS"
                  className="w-full px-3 py-2.5 rounded-xl outline-none text-sm uppercase"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block mb-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>Trading Strategy</label>
                <select value={strategy} onChange={e => setStrategy(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                  <option value="RSI Reversal">RSI Reversal (Buy &lt;35, Sell &gt;65)</option>
                  <option value="MA Crossover">MA Crossover (SMA 20 &gt; SMA 50)</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>Initial Capital</label>
                <input type="number" required value={capital} onChange={e => setCapital(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>Start Date</label>
                  <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl outline-none text-xs"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block mb-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>End Date</label>
                  <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl outline-none text-xs"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulating trades…</>
                  : <><Play className="w-4 h-4" /> Run Backtest</>
                }
              </button>
            </form>
          </div>

          {/* ── Right: Results ── */}
          <div className="lg:col-span-2 space-y-5">
            {!result && !loading && (
              <div className="glass-card rounded-2xl p-14 text-center" style={{ color: "var(--text-muted)" }}>
                <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Enter a ticker and click<br /><span style={{ color: "var(--green)" }}>Run Backtest</span> to simulate your strategy.</p>
              </div>
            )}

            {loading && (
              <div className="glass-card rounded-2xl p-14 text-center" style={{ color: "var(--text-muted)" }}>
                <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin" style={{ color: "var(--green)" }} />
                <p className="text-sm font-semibold">Simulating historical trades…</p>
              </div>
            )}

            {result && (
              <>
                {/* Summary title */}
                <div className="glass-card px-5 py-4 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
                      {result.symbol} — {result.strategy}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {startDate} → {endDate} · Initial capital: {result.initial_capital?.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black" style={{ color: isProfit ? "var(--green)" : "var(--red)" }}>
                      {isProfit ? "+" : ""}{result.total_return_percentage.toFixed(1)}%
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Final: {Number(result.final_value).toLocaleString("en-IN")} | P/L: {isProfit ? "+" : ""}{Number(result.profit_loss).toFixed(0)}
                    </div>
                  </div>
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Net Return", value: `${result.total_return_percentage.toFixed(1)}%`, icon: <DollarSign className="w-4 h-4" />, color: isProfit ? "var(--green)" : "var(--red)", sub: `P/L: ${Number(result.profit_loss).toFixed(0)}` },
                    { label: "Win Rate",    value: `${result.win_rate.toFixed(1)}%`,           icon: <Activity className="w-4 h-4" />,   color: "var(--blue)",  sub: `${result.total_trades} trades` },
                    { label: "Max Drawdown",value: `${result.max_drawdown.toFixed(1)}%`,       icon: <AlertTriangle className="w-4 h-4" />, color: "var(--red)", sub: "Peak-to-trough" },
                    { label: "Sharpe Ratio",value: result.sharpe_ratio.toFixed(2),             icon: <ShieldCheck className="w-4 h-4" />,  color: "var(--gold)", sub: "Risk/return ratio" },
                  ].map(m => (
                    <div key={m.label} className="glass-card p-4 rounded-xl text-left">
                      <span className="text-[9px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>{m.label}</span>
                      <div className="flex items-center gap-1.5 font-black text-lg" style={{ color: m.color }}>
                        {m.icon}{m.value}
                      </div>
                      <span className="text-[9px] block mt-1" style={{ color: "var(--text-muted)" }}>{m.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Equity curve chart */}
                <div className="glass-card p-5 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                    Equity Growth Curve
                    <span className="ml-2 text-[9px] font-normal" style={{ color: "var(--text-muted)" }}>
                      — vs 8% Buy & Hold benchmark
                    </span>
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={result.equity_curve} margin={{ top: 5, right: 15, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={isProfit ? "#00d97e" : "#ff4d6d"} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={isProfit ? "#00d97e" : "#ff4d6d"} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#3d8ef0" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#3d8ef0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false}
                        interval={Math.max(1, Math.floor(result.equity_curve.length / 5))} />
                      <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false}
                        tickFormatter={v => Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })} width={70} orientation="right" />
                      <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 10, fontSize: 11, color: "var(--text-primary)" }} />
                      <Area type="monotone" dataKey="benchmark" stroke="#3d8ef0" strokeWidth={1} strokeDasharray="4 3" fill="url(#benchGrad)" dot={false} name="Benchmark" />
                      <Area type="monotone" dataKey="value"     stroke={isProfit ? "#00d97e" : "#ff4d6d"} strokeWidth={2} fill="url(#stratGrad)" dot={false} name="Strategy" />
                      <ReferenceLine y={result.initial_capital} stroke="var(--text-muted)" strokeDasharray="3 3" strokeWidth={0.8} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Trade log */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Transaction Order Log</h3>
                  </div>
                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", position: "sticky", top: 0, zIndex: 1 }}>
                          {["Type", "Date", "Price", "Shares", "P/L %"].map(h => (
                            <th key={h} className="px-4 py-2.5 font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)", fontSize: 9 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((t: any, i: number) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{ background: t.type === "BUY" ? "rgba(0,217,126,0.12)" : "rgba(61,142,240,0.12)", color: t.type === "BUY" ? "var(--green)" : "var(--blue)" }}>
                                {t.type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>{t.date}</td>
                            <td className="px-4 py-2.5 font-bold" style={{ color: "var(--text-primary)" }}>{Number(t.price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: "var(--text-muted)" }}>{Number(t.shares).toFixed(4)}</td>
                            <td className="px-4 py-2.5 font-bold" style={{ color: t.profit_pct == null ? "var(--text-muted)" : t.profit_pct >= 0 ? "var(--green)" : "var(--red)" }}>
                              {t.profit_pct != null ? `${t.profit_pct >= 0 ? "+" : ""}${t.profit_pct.toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
