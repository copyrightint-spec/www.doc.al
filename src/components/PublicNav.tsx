"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Home, User, LogOut, ChevronDown, Settings, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Si Funksionon", href: "/si-funksionon" },
  { label: "Explorer", href: "/explorer" },
];

export default function PublicNav() {
  const [user, setUser] = useState<{ name: string; email: string; image?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Desktop nav links */}
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white md:block"
          >
            {link.label}
          </Link>
        ))}

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {user.image ? (
                <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:block">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 z-50">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => setMenuOpen(false)}>
                  <Home className="h-4 w-4" /> Dashboard
                </Link>
                <Link href="/settings/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => setMenuOpen(false)}>
                  <User className="h-4 w-4" /> Profili im
                </Link>
                <Link href="/settings/security" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => setMenuOpen(false)}>
                  <Settings className="h-4 w-4" /> Cilesimet
                </Link>
                <div className="border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" /> Dil nga llogaria
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/auth/login" className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:block">Hyr</Link>
            <Link href="/auth/register" className="hidden rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-slate-900 sm:block">Fillo Falas</Link>
          </>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white px-6 py-4 shadow-lg dark:border-slate-700 dark:bg-slate-900 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 min-h-[44px]"
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 min-h-[48px] flex items-center justify-center"
                >
                  Hyr
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-center text-base font-medium text-white hover:opacity-90 dark:bg-white dark:text-slate-900 min-h-[48px] flex items-center justify-center"
                >
                  Fillo Falas
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
