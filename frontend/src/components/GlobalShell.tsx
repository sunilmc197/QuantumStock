"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Sun, Moon, BarChart2, ChevronDown,
  Settings, LogOut, Home, User
} from "lucide-react";

export default function GlobalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── Load theme + user on mount ───────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem("qs_theme") as "dark" | "light" | null;
    const initial = saved || "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);

    const stored = localStorage.getItem("qs_user");
    const token = localStorage.getItem("qs_token");
    if (stored && token) {
      try { setUser(JSON.parse(stored)); setIsLoggedIn(true); } catch {}
    }
  }, []);

  /* ── Close dropdown when clicking outside ─────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("qs_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleLogout = () => {
    localStorage.removeItem("qs_token");
    localStorage.removeItem("qs_user");
    setIsLoggedIn(false);
    setUser(null);
    setProfileOpen(false);
    router.push("/");
  };

  /* ── Hide navbar on auth pages ────────────────────────── */
  const isAuthPage = pathname?.startsWith("/auth");

  return (
    <>
      {/* ════════════════ GLOBAL NAVBAR ════════════════════ */}
      {!isAuthPage && (
        <nav
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8 h-14"
          style={{
            background: theme === "dark"
              ? "rgba(5,10,14,0.90)"
              : "rgba(240,244,248,0.94)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {/* ── Logo ─────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 select-none">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--green), var(--gold))",
                boxShadow: "0 0 14px rgba(0,217,126,0.30)",
              }}
            >
              <BarChart2 className="w-4 h-4 text-black" />
            </div>
            <span
              className="font-black text-sm tracking-widest"
              style={{
                background: "linear-gradient(135deg, var(--green), var(--gold))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              QuantumStock
            </span>
          </Link>

          {/* ── Center nav links ──────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { href: "/", label: "Home", icon: <Home className="w-3.5 h-3.5" /> },
              ...(isLoggedIn ? [
                { href: "/dashboard", label: "Dashboard", icon: <BarChart2 className="w-3.5 h-3.5" /> },
                { href: "/portfolio",  label: "Portfolio",  icon: null },
                { href: "/backtest",   label: "Backtest",   icon: null },
              ] : []),
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.03]"
                style={{
                  color: pathname === item.href ? "var(--green)" : "var(--text-secondary)",
                  background: pathname === item.href ? "var(--green-dim, rgba(0,217,126,0.08))" : "transparent",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* ── Right: theme toggle + profile ─────────────── */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {theme === "dark"
                ? <Sun  className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
                : <Moon className="w-3.5 h-3.5" style={{ color: "var(--blue)" }} />
              }
            </button>

            {/* ── Profile / Auth buttons ────────────────── */}
            {isLoggedIn && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-black text-[10px] font-black"
                    style={{ background: "linear-gradient(135deg, var(--green), var(--gold))" }}
                  >
                    {user.name?.charAt(0)?.toUpperCase() || <User className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-semibold hidden md:block" style={{ color: "var(--text-primary)" }}>
                    {user.name?.split(" ")[0]}
                  </span>
                  <ChevronDown
                    className="w-3 h-3 transition-transform"
                    style={{
                      color: "var(--text-muted)",
                      transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden shadow-2xl z-50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <div className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>{user.name}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{user.email}</div>
                    </div>

                    {[
                      { href: "/profile",   label: "Account Settings", icon: <Settings className="w-3.5 h-3.5" /> },
                      { href: "/dashboard", label: "My Dashboard",     icon: <BarChart2 className="w-3.5 h-3.5" /> },
                    ].map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium w-full transition-all"
                        style={{ color: "var(--text-secondary)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        {item.icon} {item.label}
                      </Link>
                    ))}

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium w-full text-left transition-all"
                      style={{ color: "var(--red)", borderTop: "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--red-dim, rgba(255,77,109,0.06))")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-black transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, var(--green), var(--gold))",
                    boxShadow: "0 2px 10px rgba(0,217,126,0.22)",
                  }}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Page content — offset by navbar height */}
      <main className={`relative z-10 flex-grow flex flex-col ${!isAuthPage ? "pt-14" : ""}`}>
        {children}
      </main>
    </>
  );
}
