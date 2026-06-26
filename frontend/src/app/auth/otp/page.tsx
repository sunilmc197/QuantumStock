"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Cpu, ShieldCheck, ShieldAlert, Key } from "lucide-react";
import { api } from "@/services/api";

export default function OTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.verifyEmail({ email, code });
      setSuccess("Account activated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Invalid activation code.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      
      <div className="w-full max-w-md glass-card rounded-3xl p-8 relative overflow-hidden shadow-2xl border border-indigo-500/20">
        
        {/* Glow */}
        <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-cyan-500/10 blur-3xl"></div>
        
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center glow-cyan mb-4">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-wider text-slate-100 uppercase">
            OTP Activation
          </h2>
          <p className="text-xs text-slate-400 mt-1">Activate security credentials via MFA</p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 flex items-start space-x-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start space-x-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-sm">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Onboarding Registered Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full cyber-input rounded-xl py-3 px-4 text-sm"
              placeholder="name@domain.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Verification Code (6-Digits)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full cyber-input rounded-xl py-3 pl-11 pr-4 text-sm font-mono tracking-widest text-center"
                placeholder="000000"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold text-sm tracking-wider uppercase transition-all duration-300 shadow-lg shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Verifying Activation..." : "Verify & Activate"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-900 text-center">
          <Link href="/auth/login" className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline">
            Back to login terminal
          </Link>
        </div>

      </div>

    </div>
  );
}
