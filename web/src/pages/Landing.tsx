import { useNavigate } from "react-router-dom";
import { Shield, Sparkles, Users, Wallet } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8 sm:p-12">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#d6baff]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#40e56c]/10 blur-3xl" />

        <div className="relative grid gap-12 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#d6baff]/10 px-4 py-2 text-xs font-bold text-[#d6baff] uppercase tracking-wide border border-[#d6baff]/20">
              <Sparkles size={14} /> Premium Rotating Savings for West Africa
            </div>

            <h1 className="font-headline text-4xl leading-tight tracking-tight text-[#d6baff] sm:text-5xl font-extrabold">
              Save Together,
              <br />
              Win Together
            </h1>
            <p className="text-lg text-[#cdc2d7]">
              ContriPay is a modern, wallet-first Ajo/Susu platform with tiered verification—built for trust.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => navigate("/register")}
                className="rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] px-8 py-3 text-sm font-bold text-[#003912] uppercase tracking-wide shadow-[0_8px_24px_rgba(64,229,108,0.25)] hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/login")}
                className="rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 px-8 py-3 text-sm font-bold text-[#e1e2e7] uppercase tracking-wide hover:bg-[#4b4454]/30 transition-all"
              >
                Login
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-6 backdrop-blur">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-[#1d2023] border border-[#4b4454]/30 p-4">
                <div className="flex items-center gap-3 text-[#40e56c]">
                  <Wallet size={20} />
                  <span className="text-sm font-bold uppercase tracking-wide">Wallet-First</span>
                </div>
                <div className="mt-3 text-sm text-[#968da0]">Contribute with Main Wallet logic.</div>
              </div>
              <div className="rounded-lg bg-[#1d2023] border border-[#4b4454]/30 p-4">
                <div className="flex items-center gap-3 text-[#d6baff]">
                  <Shield size={20} />
                  <span className="text-sm font-bold uppercase tracking-wide">Risk-Managed</span>
                </div>
                <div className="mt-3 text-sm text-[#968da0]">Tiered KYC + buffer protection (MVP).</div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-[#1d2023] border border-[#4b4454]/30 p-4">
              <div className="flex items-center gap-3 text-amber-400">
                <Users size={20} />
                <span className="text-sm font-bold uppercase tracking-wide">Trust via KYC</span>
              </div>
              <div className="mt-3 text-sm text-[#968da0]">
                Complete Basic KYC to access groups securely.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          { icon: Shield, title: "Security Buffer", desc: "Protect early payout recipients and reduce default risk.", color: "text-[#d6baff]" },
          { icon: Sparkles, title: "Trust via KYC", desc: "Basic KYC is required for group access in MVP.", color: "text-[#40e56c]" },
          { icon: Users, title: "Group Tiers", desc: "Low/Medium groups supported in MVP with Basic KYC access.", color: "text-amber-400" },
        ].map((c) => (
          <div key={c.title} className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6 hover:bg-[#323538]/30 transition-all">
            <c.icon className={c.color} size={24} />
            <div className="mt-4 font-headline text-lg font-bold text-[#e1e2e7]">{c.title}</div>
            <div className="mt-2 text-sm text-[#968da0]">{c.desc}</div>
          </div>
        ))}
      </section>

      <footer className="pt-8 text-center text-xs font-bold text-[#968da0] uppercase tracking-wide">
        Built for trust. Powered by wallet-first contribution logic.
      </footer>
    </div>
  );
}

