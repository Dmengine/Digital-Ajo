export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount);
}

