import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  TreePine, Users, UserCog, ExternalLink, LogOut, ChevronDown,
  Settings, HelpCircle, User, Sun, Moon,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Members", icon: Users },
  { to: "/admin/users", label: "Manage Users", icon: UserCog, adminOnly: true },
];

function UserDropdown({ user, logout, navigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl
          hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200
          border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600
            flex items-center justify-center text-white font-bold text-sm
            ring-2 ring-emerald-500/20">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
            bg-emerald-400 border-2 border-white dark:border-slate-800" />
        </div>
        <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
          {user?.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800
          rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden z-50"
          style={{ animation: "fadeInUp 0.2s ease both" }}>
          {/* User info */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300 truncate">{user?.email}</p>
            <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium
              ${user?.role === "admin"
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"}`}>
              {user?.role}
            </span>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* Menu items */}
          <div className="p-1.5">
            <button onClick={() => { navigate("/profile"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <User className="w-4 h-4" /> Profile
            </button>
            {user?.role === "admin" && (
              <button onClick={() => { navigate("/admin/users"); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <Settings className="w-4 h-4" /> Manage Users
              </button>
            )}
            <button onClick={() => { navigate("/help"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <HelpCircle className="w-4 h-4" /> Help & Support
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700" />

          <div className="p-1.5">
            <button
              onClick={() => { logout(); navigate("/login"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = Boolean(user);

  return (
    <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600 shadow-sm">
      <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600
            flex items-center justify-center shadow-md shadow-emerald-500/20
            group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-shadow">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600
              bg-clip-text text-transparent">
              Family Tree
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-300 leading-tight">
              Manage your legacy
            </p>
          </div>
        </Link>

        {/* Center: Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium
              text-slate-500 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700 transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4" /> Repo
          </a>
        </nav>

        {/* Theme toggle */}
        <button onClick={toggle}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700 transition-colors"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Right: User or Login */}
        {loggedIn ? (
          <UserDropdown user={user} logout={logout} navigate={navigate} />
        ) : (
          <Link to="/login"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white
              bg-gradient-to-r from-emerald-600 to-teal-600
              hover:from-emerald-700 hover:to-teal-700
              shadow-md shadow-emerald-500/20 transition-all duration-200">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
