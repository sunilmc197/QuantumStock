"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Settings, ChevronLeft, User, Phone, Map, Briefcase, FileText, BadgeInfo, AlertCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";

export default function ProfilePage() {
  const router = useRouter();
  
  // Profile Form variables
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [preferredMarket, setPreferredMarket] = useState("US");
  const [investmentExperience, setInvestmentExperience] = useState("Beginner");
  const [riskAppetite, setRiskAppetite] = useState("Medium");
  const [investmentDuration, setInvestmentDuration] = useState("Medium");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current info from database
    const token = localStorage.getItem("qs_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    api.getMe()
      .then((data) => {
        setName(data.name || "");
        setEmail(data.email || "");
        setPhoneNumber(data.phone_number || "");
        setBio(data.bio || "");
        setCountry(data.country || "");
        setPreferredMarket(data.preferred_market || "US");
        setInvestmentExperience(data.investment_experience || "Beginner");
        setRiskAppetite(data.risk_appetite || "Medium");
        setInvestmentDuration(data.investment_duration || "Medium");
      })
      .catch((err) => {
        console.error("Failed to load user details from API. Using local session info.", err);
        const local = localStorage.getItem("qs_user");
        if (local) {
          const u = JSON.parse(local);
          setName(u.name || "");
          setEmail(u.email || "");
          setRiskAppetite(u.risk_appetite || "Medium");
          setPreferredMarket(u.preferred_market || "US");
        }
      });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.updateProfile({
        name,
        phone_number: phoneNumber || undefined,
        bio: bio || undefined,
        country: country || undefined,
        preferred_market: preferredMarket,
        investment_experience: investmentExperience,
        risk_appetite: riskAppetite,
        investment_duration: investmentDuration
      });

      // Update local storage representation
      const local = localStorage.getItem("qs_user");
      if (local) {
        const u = JSON.parse(local);
        u.name = name;
        u.preferred_market = preferredMarket;
        u.risk_appetite = riskAppetite;
        localStorage.setItem("qs_user", JSON.stringify(u));
      }

      setSuccess("Profile settings successfully updated!");
      setLoading(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile details.");
      setLoading(false);
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

      {/* Main card panel */}
      <div className="glass-card rounded-3xl p-8 relative overflow-hidden border border-slate-900">
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/5 blur-3xl"></div>

        <h2 className="text-xl font-black text-slate-100 flex items-center space-x-2.5 mb-8 uppercase tracking-wider">
          <Settings className="w-5.5 h-5.5 text-cyan-400" />
          <span>Security Profile Settings</span>
        </h2>

        {/* Notifications */}
        {error && (
          <div className="mb-6 flex items-start space-x-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start space-x-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-sm">
            <BadgeInfo className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6 text-xs font-semibold">
          
          {/* Identity metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-slate-400 mb-2">Security Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-2">Email Address (Locked)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-600">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium opacity-50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-slate-400 mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium"
                  placeholder="+1 555-0199"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-2">Country Location</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Map className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium"
                  placeholder="United States"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-2">Brief Bio Summary</label>
            <div className="relative">
              <div className="absolute top-3 left-3 text-slate-500">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full cyber-input rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium h-20 outline-none"
                placeholder="A brief background on your investment strategies..."
              />
            </div>
          </div>

          {/* Investment variables */}
          <div className="border-t border-slate-900 pt-6">
            <h3 className="text-sm font-bold text-cyan-400 mb-4 tracking-wider uppercase">Investment Profile Variables</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-slate-400 mb-2">Preferred market segment</label>
                <select
                  value={preferredMarket}
                  onChange={(e) => setPreferredMarket(e.target.value)}
                  className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm font-medium"
                >
                  <option value="US">US (NASDAQ/NYSE)</option>
                  <option value="IN">IN (NSE/BSE)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Experience level</label>
                <select
                  value={investmentExperience}
                  onChange={(e) => setInvestmentExperience(e.target.value)}
                  className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm font-medium"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div>
                <label className="block text-slate-400 mb-2">Risk Appetite tolerance</label>
                <select
                  value={riskAppetite}
                  onChange={(e) => setRiskAppetite(e.target.value)}
                  className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm font-medium"
                >
                  <option value="Low">Low (Conservative)</option>
                  <option value="Medium">Medium (Moderate)</option>
                  <option value="High">High (Aggressive)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Holding Duration target</label>
                <select
                  value={investmentDuration}
                  onChange={(e) => setInvestmentDuration(e.target.value)}
                  className="w-full cyber-input rounded-xl py-2.5 px-3 text-sm font-medium"
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
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {loading ? "Updating changes..." : "Save changes"}
          </button>

        </form>

      </div>

    </div>
  );
}
