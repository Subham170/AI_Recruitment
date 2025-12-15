import React from "react";

export const GlassBackground = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-linear-to-br from-[#eef2ff] via-[#f7f7fb] to-[#f5ecff]" />
    <div className="absolute top-[-12%] left-[-12%] h-[55%] w-[55%] rounded-full bg-sky-200/55 blur-[140px] animate-pulse" />
    <div className="absolute bottom-[-12%] right-[-12%] h-[58%] w-[58%] rounded-full bg-fuchsia-200/55 blur-[150px] animate-pulse delay-1000" />
    <div className="absolute top-[38%] left-[46%] h-[34%] w-[34%] rounded-full bg-rose-200/45 blur-[120px]" />
    <div className="absolute inset-0 opacity-60" style={{
      backgroundImage: "radial-gradient(circle at 20% 20%, rgba(129,140,248,0.28) 0, transparent 32%), radial-gradient(circle at 80% 30%, rgba(244,114,182,0.22) 0, transparent 35%), radial-gradient(circle at 70% 75%, rgba(56,189,248,0.18) 0, transparent 32%)"
    }} />
  </div>
);

export const GlassCard = ({ children, className = "" }) => (
  <div
    className={`w-full max-w-[460px] rounded-[36px] border border-white/60 bg-gradient-to-br from-white/85 via-white/65 to-white/55 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.45)] backdrop-blur-3xl ring-1 ring-white/45 ${className}`}
  >
    {children}
  </div>
);

export const GlassPageShell = ({ children, className = "" }) => (
  <div
    className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef2f7] px-4 py-12 ${className}`}
  >
    <GlassBackground />
    <div className="relative z-10 flex w-full justify-center">
      <div className="absolute inset-0 -z-10 blur-[120px] opacity-50" style={{
        backgroundImage: "radial-gradient(800px 400px at 60% 60%, rgba(56,189,248,0.25), transparent), radial-gradient(700px 380px at 30% 40%, rgba(99,102,241,0.25), transparent)"
      }} />
      {children}
    </div>
  </div>
);

