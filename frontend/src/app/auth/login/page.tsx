"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BarChart2, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/services/api";


function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("expired")) {
      setError("Your session has expired. Please sign in again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    try {
      /* ── Try real backend first ─────────────────────── */
      const res = await api.login({ email, password, otp_code: otpCode || undefined });

      if (res.mfa_required) {
        setMfaRequired(true);
        setSuccess("MFA enabled. Enter your 6-digit OTP.");
        setLoading(false);
        return;
      }

      if (res.access_token) {
        localStorage.setItem("qs_token", res.access_token);
        localStorage.setItem("qs_user", JSON.stringify(res.user));
        setSuccess("Login successful! Redirecting…");
        setTimeout(() => router.push("/dashboard"), 1200);
        return;
      }

    } catch (err: any) {
      /* ── Wrong credentials or real error ─────────── */
      const msg = err.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch")) {
        setError("Cannot reach the server. Please check your backend connection.");
      } else {
        setError(msg || "Incorrect email or password. Please try again.");
      }
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--input-bg)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    width: "100%",
    borderRadius: 12,
    padding: "12px 16px 12px 42px",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: "var(--bg-primary)" }}>

      <div
        className="w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        style={{
          background: "var(--card-bg)",
          backdropFilter: "blur(24px)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Background glows */}
        <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,217,126,0.08), transparent 70%)" }} />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(245,166,35,0.07), transparent 70%)" }} />

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 animate-float"
            style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", boxShadow: "0 0 24px rgba(0,217,126,0.30)" }}>
            <BarChart2 className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-black tracking-widest" style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            QuantumStock
          </h1>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>Sign in to your account</p>
        </div>


        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 p-4 rounded-xl text-sm"
            style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.25)", color: "var(--red)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-5 flex items-start gap-3 p-4 rounded-xl text-sm"
            style={{ background: "rgba(0,217,126,0.08)", border: "1px solid rgba(0,217,126,0.25)", color: "var(--green)" }}>
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!mfaRequired ? (
            <>
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--green)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Password</label>
                  <Link href="/auth/forgot-password" className="text-xs hover:underline" style={{ color: "var(--gold)" }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  <input
                    type={showPassword ? "text" : "password"} required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--green)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-all"
                    style={{ color: "var(--text-muted)" }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* OTP field */
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--green)" }}>2FA Verification Code</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text" maxLength={6} required
                  value={otpCode} onChange={e => setOtpCode(e.target.value)}
                  placeholder="000000"
                  style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.3em", fontFamily: "monospace" }}
                />
              </div>
              <p className="text-[10px] mt-2 text-center" style={{ color: "var(--text-muted)" }}>
                Enter code from your Authenticator app.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 mt-2"
            style={{ background: "linear-gradient(135deg, var(--green), var(--gold))", boxShadow: "0 4px 18px rgba(0,217,126,0.22)" }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              : mfaRequired ? "Verify OTP" : "Sign In"
            }
          </button>
        </form>

        {/* Footer */}
        <div className="mt-7 pt-5 text-center" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            New to QuantumStock?{" "}
            <Link href="/auth/register" className="font-bold hover:underline" style={{ color: "var(--green)" }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--green)" }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
