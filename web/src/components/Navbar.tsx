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
      { to: "/groups/browse", label: "Circles" },
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
    <header className="sticky top-0 z-50 border-b border-[#4b4454]/20 bg-[#1d2023]/70 backdrop-blur supports-backdrop-filter:bg-[#1d2023]/30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-headline font-bold tracking-tight text-[#d6baff]">
            <span className="rounded-lg bg-linear-to-r from-[#d6baff] to-[#ab73ff] px-3 py-1.5 text-sm text-[#111417] shadow-lg font-black">
              ContriPay
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {token ? (
            <>
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-[#d6baff]/20 text-[#d6baff]"
                        : "text-[#cdc2d7] hover:bg-[#4b4454]/20 hover:text-[#d6baff]",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={doLogout}
                className="ml-3 rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] px-4 py-2 text-sm font-bold text-[#003912] hover:opacity-90 transition-opacity"
              >
                Logout
              </button>
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="ml-3 hidden h-8 w-8 rounded-full border border-[#d6baff]/30 object-cover md:block"
                />
              ) : (
                <div className="ml-3 hidden rounded-full bg-[#d6baff]/10 px-3 py-1 text-xs font-semibold text-[#d6baff] md:block">
                  {initials(user?.name)}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  [
                    "rounded-lg px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-[#d6baff]/20 text-[#d6baff]"
                      : "text-[#cdc2d7] hover:bg-[#4b4454]/20 hover:text-[#d6baff]",
                  ].join(" ")
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] px-4 py-2 text-sm font-bold text-[#003912] hover:opacity-90 transition-opacity"
              >
                Sign Up
              </NavLink>
            </div>
          )}
        </nav>

        <div className="flex items-center md:hidden">
          {token ? (
            <div className="flex items-center gap-2">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="h-8 w-8 rounded-full border border-[#d6baff]/30 object-cover"
                />
              ) : (
                <div className="rounded-full bg-[#d6baff]/10 px-3 py-1 text-xs font-semibold text-[#d6baff]">
                  {initials(user?.name)}
                </div>
              )}
              <button
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-[#d6baff] hover:bg-[#4b4454]/20"
              >
                <Menu size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink to="/login" className="rounded-lg px-3 py-2 text-sm text-[#cdc2d7] hover:bg-[#4b4454]/20">
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] px-3 py-2 text-sm font-bold text-[#003912] hover:opacity-90"
              >
                Sign Up
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[#4b4454]/20 bg-[#1d2023] p-4 md:hidden">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[#cdc2d7]">Menu</div>
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-[#d6baff] hover:bg-[#4b4454]/20"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    "rounded-lg px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-[#d6baff]/20 text-[#d6baff]"
                      : "text-[#cdc2d7] hover:bg-[#4b4454]/20 hover:text-[#d6baff]",
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
              className="mt-3 rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] px-4 py-3 text-sm font-bold text-[#003912] hover:opacity-90"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

