import { HandCoins } from "lucide-react";

export const NON_CUSTODIAL_NOTICE =
  "ContriPay does not hold your money. Contributions are paid directly between group members.";

export function NonCustodialNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-[#40e56c]/20 bg-[#40e56c]/5 p-4 text-sm text-[#cdc2d7] ${className}`}
    >
      <HandCoins size={18} className="mt-0.5 shrink-0 text-[#40e56c]" />
      <p>{NON_CUSTODIAL_NOTICE}</p>
    </div>
  );
}
