import { useNavigate } from "react-router-dom";
import { Shield, Sparkles, Users, Wallet } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-indigo-500/15 via-emerald-500/10 to-amber-500/10 p-6 sm:p-10">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-slate-200">
              <Sparkles size={14} /> Premium rotating savings for West Africa
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Save Together, Win Together
            </h1>
            <p className="text-slate-700 dark:text-slate-300">
              ContriPay is a modern, wallet-first Ajo/Susu platform with tiered verification—built for trust.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/register")}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/login")}
                className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-slate-900 dark:text-white shadow-sm hover:bg-white/15"
              >
                Login
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-sm backdrop-blur dark:bg-slate-900/40">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/60 p-4 dark:bg-slate-950/40">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <Wallet size={18} />
                  <span className="text-sm font-semibold">Wallet-first</span>
                </div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Contribute with Main Wallet logic.</div>
              </div>
              <div className="rounded-xl bg-white/60 p-4 dark:bg-slate-950/40">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <Shield size={18} />
                  <span className="text-sm font-semibold">Risk-managed</span>
                </div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Tiered KYC + buffer protection (MVP).</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-white/60 p-4 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Users size={18} />
                <span className="text-sm font-semibold">Trust via KYC</span>
              </div>
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                Complete Basic KYC to access groups securely.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Shield, title: "Security buffer", desc: "Protect early payout recipients and reduce default risk." },
          { icon: Sparkles, title: "Trust via KYC", desc: "Basic KYC is required for group access in MVP." },
          { icon: Users, title: "Group tiers", desc: "Low/Medium groups supported in MVP with Basic KYC access." },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
            <c.icon className="text-emerald-600" size={22} />
            <div className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{c.title}</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{c.desc}</div>
          </div>
        ))}
      </section>

      <footer className="pt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Built for trust. Powered by wallet-first contribution logic.
      </footer>
    </div>
  );
}

