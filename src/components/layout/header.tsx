"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, ChevronDown, LogOut, Settings, Home } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { type NavItem } from "./nav-items";

interface UserSession {
  role: string;
  name: string;
  email: string;
  image?: string;
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  user: UserSession | null;
  variant?: "default" | "admin";
  settingsItems?: NavItem[];
  onMenuClick: () => void;
}

export function Header({
  title,
  user,
  variant = "default",
  settingsItems,
  onMenuClick,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = variant === "admin";
  const isAdminUser = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <div className="fixed left-0 right-0 top-0 z-20 lg:left-[260px]">
      <header
        className={cn(
          "flex h-14 items-center justify-between border-b px-6 backdrop-blur-sm",
          isAdmin
            ? "border-slate-800 bg-slate-900/80"
            : "border-border bg-card/80"
        )}
      >
        <div className="flex items-center gap-4">
          <button className="lg:hidden" onClick={onMenuClick}>
            <Menu className={cn("h-5 w-5", isAdmin ? "text-slate-400" : "text-muted-foreground")} />
          </button>
          <h1 className={cn(
            "text-lg font-semibold",
            isAdmin ? "text-slate-50" : "text-foreground"
          )}>
            {title}
          </h1>
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                isAdmin ? "hover:bg-slate-800" : "hover:bg-muted"
              )}
            >
              <Avatar className="h-8 w-8">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className={cn("text-sm font-medium", isAdmin ? "text-slate-100" : "text-foreground")}>
                  {user.name}
                </p>
                <p className={cn("text-xs", isAdmin ? "text-slate-500" : "text-muted-foreground")}>
                  {user.email}
                </p>
              </div>
              <ChevronDown className={cn("h-4 w-4", isAdmin ? "text-slate-500" : "text-muted-foreground")} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className={cn(
                  "absolute right-0 z-20 mt-2 w-56 rounded-xl border py-1 shadow-xl",
                  isAdmin
                    ? "border-slate-800 bg-slate-900"
                    : "border-border bg-card"
                )}>
                  <div className={cn("border-b px-4 py-3", isAdmin ? "border-slate-800" : "border-border")}>
                    <p className={cn("text-sm font-medium", isAdmin ? "text-slate-100" : "text-foreground")}>
                      {user.name}
                    </p>
                    <p className={cn("text-xs", isAdmin ? "text-slate-500" : "text-muted-foreground")}>
                      {user.email}
                    </p>
                    <span className={cn(
                      "mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      isAdminUser
                        ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {user.role}
                    </span>
                  </div>

                  {/* Settings links in dropdown */}
                  {settingsItems?.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                        isAdmin
                          ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => setMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4" strokeWidth={1.5} />
                      {item.label}
                    </Link>
                  ))}

                  {isAdminUser && !isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" strokeWidth={1.5} />
                      Admin Panel
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Home className="h-4 w-4" strokeWidth={1.5} />
                      Dashboard
                    </Link>
                  )}

                  <div className={cn("mt-1 border-t pt-1", isAdmin ? "border-slate-800" : "border-border")}>
                    <button
                      onClick={() => signOut({ callbackUrl: "/auth/login" })}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2 text-sm",
                        isAdmin
                          ? "text-red-400 hover:bg-slate-800"
                          : "text-destructive hover:bg-muted"
                      )}
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.5} />
                      Dil nga llogaria
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </header>
    </div>
  );
}
