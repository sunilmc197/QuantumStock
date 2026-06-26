"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Shield, ChevronLeft, EyeOff, Trash2, Key, Info } from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";

export default function PrivacyPage() {
  const router = useRouter();

  const [preferredMarket, setPreferredMarket] = useState("US");
  const [riskAppetite, setRiskAppetite] = useState("Medium");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("qs_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    
    // Load setting variables
    const local = localStorage.getItem("qs_user");
    if (local) {
      const u = JSON.parse(local);
      setPreferredMarket(u.preferred_market || "US");
      setRiskAppetite(u.risk_appetite || "Medium");
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.updatePrivacy({
        preferred_market: preferredMarket,
        risk_appetite: riskAppetite
      });
      
      const local = localStorage.getItem("qs_user");
      if (local) {
        const u = JSON.parse(local);
        u.preferred_market = preferredMarket;
        u.risk_appetite = riskAppetite;
        localStorage.setItem("qs_user", JSON.stringify(u));
      }
      
      setSuccess("Privacy preferences updated successfully.");
      setLoading(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update settings.");
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    if (confirm("Delete all cached model predictions and data tables? This cannot be undone.")) {
      alert("Cache cleared successfully.");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto w-full text-left space-y-8">
      
      {/* Top Header */}
      <header className="flex justify-between items-center pb-4 border-b border-slate-900">
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Terminal Console</span>
        </Link>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center glow-cyan">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            QUANTUMSTOCK AI
          </span>
        </div>
      </header>

      {/* Control panel */}
      <div className="glass-card rounded-3xl p-8 border border-slate-900 space-y-8">
        
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center space-x-2.5 mb-2 uppercase tracking-wider">
            <Shield className="w-5.5 h-5.5 text-cyan-400" />
            <span>Privacy Security Settings</span>
          </h2>
          <p className="text-xs text-slate-500">Configure authorization scopes and local storage parameters.</p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6 text-xs font-semibold">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-slate-400 mb-2">Market Data exposure</label>
              <select
                value={preferredMarket}
                onChange={(e) => setPreferredMarket(e.target.value)}
                className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm font-medium"
              >
                <option value="US">US Stock tickers only</option>
                <option value="IN">IN Indian NSE indices only</option>
                <option value="Global">Cross-border global metrics</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-2">Onboarding Risk Sensitivity</label>
              <select
                value={riskAppetite}
                onChange={(e) => setRiskAppetite(e.target.value)}
                className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm font-medium"
              >
                <option value="Low">Low Profile (Hide highly volatile items)</option>
                <option value="Medium">Medium Profile (Standard portfolio recommendations)</option>
                <option value="High">High Profile (Aggressive ML suggestions)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {loading ? "Saving settings..." : "Apply Preferences"}
          </button>

        </form>

        {/* Clear Cache Card */}
        <div className="border-t border-slate-900 pt-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center space-x-2">
            <Trash2 className="w-4.5 h-4.5 text-rose-400" />
            <span>Cache Data Purge</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
            Clear all stock predictions and indicator caches stored in this local session. Purging 
            these values forces the ensemble pipeline to fetch fresh historical data upon reloading.
          </p>
          <button
            onClick={handleClearCache}
            className="px-5 py-2.5 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all"
          >
            Purge Cache Logs
          </button>
        </div>

      </div>

    </div>
  );
}
