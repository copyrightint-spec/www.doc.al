"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function PublicNav() {
  const [user, setUser] = useState<{ name: string; email: string; image?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-4">
      <Link href="/si-funksionon" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Si Funksionon</Link>
      <Link href="/explorer" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Explorer</Link>
      <Link href="/verify" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Verify</Link>
      <Link href="/certificates" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Certifikata</Link>
      {user ? (
        <Link href="/dashboard" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          {user.image ? (
            <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:block">{user.name}</span>
        </Link>
      ) : (
        <>
          <Link href="/auth/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hyr</Link>
          <Link href="/auth/register" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-slate-900">Fillo Falas</Link>
        </>
      )}
    </div>
  );
}
