import { Link, useNavigate } from "react-router-dom";
import { Bell, CalendarClock, HandCoins, Users } from "lucide-react";
import { NonCustodialNotice } from "../components/NonCustodialNotice";

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
              <Users size={14} /> Ajo / Esusu, organised
            </div>

            <h1 className="font-headline text-4xl leading-tight tracking-tight text-[#d6baff] sm:text-5xl font-extrabold">
              Save Together,
              <br />
              Take Turns
            </h1>
            <p className="text-lg text-[#cdc2d7]">
              ContriPay helps your ajo group stay organised: who receives each round, who has paid, and friendly
              reminders before every due date.
            </p>

            <NonCustodialNotice />

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
                  <HandCoins size={20} />
                  <span className="text-sm font-bold uppercase tracking-wide">Pay Each Other</span>
                </div>
                <div className="mt-3 text-sm text-[#968da0]">
                  Each round, members send their contribution straight to the recipient's bank account.
                </div>
              </div>
              <div className="rounded-lg bg-[#1d2023] border border-[#4b4454]/30 p-4">
                <div className="flex items-center gap-3 text-[#d6baff]">
                  <Bell size={20} />
                  <span className="text-sm font-bold uppercase tracking-wide">Reminders</span>
                </div>
                <div className="mt-3 text-sm text-[#968da0]">Nudges 48 and 24 hours before each due date.</div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-[#1d2023] border border-[#4b4454]/30 p-4">
              <div className="flex items-center gap-3 text-amber-400">
                <CalendarClock size={20} />
                <span className="text-sm font-bold uppercase tracking-wide">Clear Turns</span>
              </div>
              <div className="mt-3 text-sm text-[#968da0]">
                Everyone can see whose turn it is and whether the group admin has confirmed their payment.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            icon: Users,
            title: "Save with people you trust",
            desc: "Invite friends, family or colleagues. Only members can see a group.",
            color: "text-[#d6baff]",
          },
          {
            icon: HandCoins,
            title: "Confirmed by your admin",
            desc: "Members tap “I've sent my payment”; only the group admin can mark a contribution as paid.",
            color: "text-[#40e56c]",
          },
          {
            icon: Bell,
            title: "Reliability score",
            desc: "Paying on time builds your score. Missed payments lower it.",
            color: "text-amber-400",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6 hover:bg-[#323538]/30 transition-all">
            <c.icon className={c.color} size={24} />
            <div className="mt-4 font-headline text-lg font-bold text-[#e1e2e7]">{c.title}</div>
            <div className="mt-2 text-sm text-[#968da0]">{c.desc}</div>
          </div>
        ))}
      </section>

      <footer className="space-y-2 pt-8 text-center text-xs text-[#968da0]">
        <div className="font-bold uppercase tracking-wide">
          A coordination and reminder tool for ajo groups. Money moves directly between members.
        </div>
        <Link to="/privacy" className="underline hover:text-[#d6baff]">
          Privacy notice
        </Link>
      </footer>
    </div>
  );
}
