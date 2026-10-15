import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const collected: Array<{ what: string; why: string }> = [
  { what: "Full name", why: "So group members know who they are saving with and who is receiving each round." },
  { what: "Email address", why: "To sign you in and send account-related messages." },
  { what: "Phone number", why: "To send contribution reminders and group notifications by SMS." },
  { what: "Username and profile photo (optional)", why: "So members can find and recognise you in a group." },
  {
    what: "Bank account number, bank name and account holder name",
    why: "So other members can pay you directly when it is your turn to receive. We confirm the account holder name with your bank through our payment provider (Paystack). Only members of your groups see these details.",
  },
  {
    what: "Last 4 digits of your BVN or NIN",
    why: "As a basic identity detail for group trust. We do not store the full number and we do not verify it.",
  },
  {
    what: "Group activity",
    why: "Payment status for each round (your \u201cI've sent my payment\u201d reports and the group admin's confirmations), transfer references you choose to add, group chat messages and your reliability score.",
  },
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-bold uppercase tracking-wide">Draft: not yet reviewed</div>
          <p className="mt-1">
            This privacy notice is a working draft and has not been reviewed for compliance with the Nigeria Data
            Protection Act 2023. Do not rely on it as final.
          </p>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="font-headline text-3xl font-extrabold text-[#d6baff]">Privacy notice</h1>
        <p className="text-[#cdc2d7]">
          ContriPay helps ajo groups coordinate contributions. ContriPay does not hold your money. Contributions are
          paid directly between group members. This page explains what personal data we collect and why.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">What we collect and why</h2>
        <div className="overflow-hidden rounded-lg border border-[#4b4454]/30">
          {collected.map((row) => (
            <div key={row.what} className="grid gap-1 border-b border-[#4b4454]/30 bg-[#1d2023] p-4 last:border-b-0 sm:grid-cols-3 sm:gap-4">
              <div className="font-semibold text-[#e1e2e7]">{row.what}</div>
              <div className="text-sm text-[#cdc2d7] sm:col-span-2">{row.why}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2 text-sm text-[#cdc2d7]">
        <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">What we don't collect</h2>
        <p>
          We do not collect card details, and we do not receive, hold or transfer contributions. Your date of birth and
          residential address are requested during sign-up checks but are not currently stored.
        </p>
      </section>

      <section className="space-y-2 text-sm text-[#cdc2d7]">
        <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">Who we share it with</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Members of groups you belong to (name, username, payout bank details, payment status).</li>
          <li>Paystack, to confirm your bank account holder name.</li>
          <li>Twilio, to deliver SMS reminders to your phone number.</li>
          <li>Cloudinary, to host your profile photo if you upload one.</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm text-[#cdc2d7]">
        <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">Your rights</h2>
        <p>
          You can ask to access, correct or delete your personal data, or withdraw consent, by contacting us.
          {/* TODO(owner): add contact email / DPO details, retention periods and lawful basis per data item. */}
        </p>
      </section>

      <p className="text-sm text-[#968da0]">
        <Link to="/register" className="text-[#40e56c] font-bold hover:underline">
          Back to sign up
        </Link>
      </p>
    </div>
  );
}
