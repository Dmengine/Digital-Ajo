import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { logout as apiLogout } from "../api/auth.api";

function initials(name?: string | null) {
  if (!name) return "DA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "D";
  const b = parts[1]?.[0] ?? "A";
  return (a + b).toUpperCase();
}

export function Navbar() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/groups/browse", label: "Groups" },
      { to: "/wallet", label: "Wallet" },
      { to: "/profile", label: "Profile" },
    ],
    []
  );

  const doLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // even if the backend fails, we can still clear local state
    }
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/60 backdrop-blur supports-[backdrop-filter]:bg-slate-950/30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-bold tracking-tight text-white">
            <span className="rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-3 py-1 text-sm text-white shadow-sm">
              ContriPay
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {token ? (
            <>
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "rounded-lg px-3 py-2 text-sm transition",
                      isActive ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={doLogout}
                className="ml-2 rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
              >
                Logout
              </button>
              <div className="ml-2 hidden rounded-full bg-white/10 px-3 py-1 text-sm text-white md:block">
                {initials(user?.name)}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  [
                    "rounded-xl px-4 py-2 text-sm font-medium",
                    isActive ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5",
                  ].join(" ")
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Get Started
              </NavLink>
            </div>
          )}
        </nav>

        <div className="flex items-center md:hidden">
          {token ? (
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                {initials(user?.name)}
              </div>
              <button
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl p-2 text-white hover:bg-white/10"
              >
                <Menu size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink to="/login" className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-xl bg-emerald-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Get Started
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-slate-950 p-4 md:hidden">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-200">Menu</div>
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl p-2 text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    "rounded-xl px-4 py-3 text-sm transition",
                    isActive ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false);
                doLogout();
              }}
              className="mt-2 rounded-xl bg-rose-500/90 px-4 py-3 text-sm font-medium text-white hover:bg-rose-500"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

