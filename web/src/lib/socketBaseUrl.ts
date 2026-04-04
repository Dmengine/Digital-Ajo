/** Socket.IO runs on the API host (not under `/api`). */
export function getSocketBaseUrl(): string {
   const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
  const trimmed = base.replace(/\/$/, "");
   return trimmed.replace(/\/api$/, "") || "http://localhost:3001";
}
