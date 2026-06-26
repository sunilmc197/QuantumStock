import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ParticleBackground from "@/components/ParticleBackground";
import GlobalShell from "@/components/GlobalShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuantumStock | AI-Powered Stock Prediction Platform",
  description: "QuantumStock predicts global stock trends using LSTM, XGBoost and ensemble ML models with plain-English SHAP explanations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col relative font-sans"
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <ParticleBackground />
        <GlobalShell>{children}</GlobalShell>
      </body>
    </html>
  );
}
