"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, Mail, Lock, User, Phone, Map, ShieldAlert, BadgeInfo } from "lucide-react";
import { api } from "@/services/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("Sunil");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("India");
  const [preferredMarket, setPreferredMarket] = useState("US");
  const [investmentExperience, setInvestmentExperience] = useState("Beginner");
  const [riskAppetite, setRiskAppetite] = useState("Medium");
  const [investmentDuration, setInvestmentDuration] = useState("Medium");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpInfo, setOtpInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Password strength checker helper
  const getPasswordStrength = () => {
    if (!password) return { text: "Empty", color: "bg-slate-800" };
    if (password.length < 6) return { text: "Weak", color: "bg-rose-500 w-1/3" };
    if (password.length < 10) return { text: "Moderate", color: "bg-amber-500 w-2/3" };
    return { text: "Strong", color: "bg-emerald-500 w-full" };
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.register({
        name,
        email,
        password,
        phone_number: phoneNumber || undefined,
        country,
        preferred_market: preferredMarket,
        investment_experience: investmentExperience,
        risk_appetite: riskAppetite,
        investment_duration: investmentDuration
      });

      setSuccess("Account initialized! MFA security credentials generated.");
      setOtpInfo(res);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to initialize credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      
      <div className="w-full max-w-xl glass-card rounded-3xl p-8 relative overflow-hidden shadow-2xl border border-indigo-500/20">
        
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-cyan-500/10 blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-purple-500/10 blur-3xl"></div>

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center glow-cyan mb-4">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-wider text-slate-100 uppercase">
            Register Profile
          </h2>
          <p className="text-xs text-slate-400 mt-1">Set up your profile configurations</p>
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
            <BadgeInfo className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {!otpInfo ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            
            {/* Core credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
                    placeholder="Sunil"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
                    placeholder="john@domain.com"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
                    placeholder="••••••••••••"
                  />
                </div>
                {/* Password strength meter */}
                {password && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${getPasswordStrength().color} transition-all duration-300`}></div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                      <span>Password Strength:</span>
                      <span className="font-bold">{getPasswordStrength().text}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>
            </div>

            {/* Profile Variables - Risk appetite, durations */}
            <div className="border-t border-slate-900 pt-5">
              <h3 className="text-sm font-bold text-cyan-400 mb-4 tracking-wider uppercase">Onboarding Profile Variables</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Country location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Map className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
                      placeholder="India"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Preferred market
                  </label>
                  <select
                    value={preferredMarket}
                    onChange={(e) => setPreferredMarket(e.target.value)}
                    className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm"
                  >
                    <option value="US">US (NASDAQ/NYSE)</option>
                    <option value="IN">IN (NSE/BSE)</option>
                    <option value="Global">Global Benchmarks</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Experience
                  </label>
                  <select
                    value={investmentExperience}
                    onChange={(e) => setInvestmentExperience(e.target.value)}
                    className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Risk appetite
                  </label>
                  <select
                    value={riskAppetite}
                    onChange={(e) => setRiskAppetite(e.target.value)}
                    className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm"
                  >
                    <option value="Low">Low (Conservative)</option>
                    <option value="Medium">Medium (Moderate)</option>
                    <option value="High">High (Aggressive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Duration
                  </label>
                  <select
                    value={investmentDuration}
                    onChange={(e) => setInvestmentDuration(e.target.value)}
                    className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm"
                  >
                    <option value="Short">Short (&lt; 1yr)</option>
                    <option value="Medium">Medium (1-5yrs)</option>
                    <option value="Long">Long (5yrs+)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold text-sm tracking-wider uppercase transition-all duration-300 shadow-lg shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Generating Security Environment..." : "Create Security Environment"}
            </button>
          </form>
        ) : (
          /* OTP MFA setup screen */
          <div className="space-y-6 text-center">
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-indigo-500/20 text-left">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Verification Instructions</h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                We have generated a multi-factor authenticator secret. To complete verification, 
                scan the QR code using Google Authenticator, or manually key in the credentials:
              </p>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 font-mono text-xs break-all text-purple-400 select-all">
                {otpInfo.totp_uri}
              </div>
            </div>

            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-900 max-w-xs mx-auto">
              <span className="text-xs font-semibold text-slate-400 block mb-3">Copy this verification OTP for direct sign-up activation:</span>
              <span className="font-mono text-3xl font-extrabold text-cyan-400 tracking-widest">{otpInfo.demo_verification_otp}</span>
            </div>

            <Link
              href={`/auth/otp?email=${encodeURIComponent(email)}`}
              className="w-full inline-block py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold text-sm tracking-wider uppercase transition-all duration-300 shadow-lg shadow-purple-500/20 text-center"
            >
              Verify OTP Code
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-900 text-center">
          <p className="text-xs text-slate-400">
            Already registered?{" "}
            <Link href="/auth/login" className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline">
              Enter credentials
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
}
