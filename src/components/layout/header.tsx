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
    <div className="fixed left-0 right-0 top-0 z-20 md:left-[260px]">
      <header
        className={cn(
          "flex h-12 items-center justify-between border-b px-4 backdrop-blur-sm md:h-14 md:px-6",
          isAdmin
            ? "border-slate-800 bg-slate-900/80"
            : "border-border bg-card/80"
        )}
      >
        <div className="flex items-center gap-3 md:gap-4">
          {/* Hamburger only visible below md when sidebar is hidden */}
          <button className="hidden" onClick={onMenuClick} aria-label="Open menu">
            <Menu className={cn("h-5 w-5", isAdmin ? "text-slate-400" : "text-muted-foreground")} />
          </button>
          <h1 className={cn(
            "text-base font-semibold md:text-lg",
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
                  "fixed inset-x-0 bottom-0 top-auto z-20 rounded-t-2xl border-t py-1 shadow-xl md:absolute md:inset-auto md:right-0 md:bottom-auto md:mt-2 md:w-56 md:rounded-xl md:border",
                  isAdmin
                    ? "border-slate-800 bg-slate-900"
                    : "border-border bg-card"
                )}
                  style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                >
                  {/* Mobile sheet handle */}
                  <div className="flex justify-center py-2 md:hidden">
                    <div className={cn(
                      "h-1 w-10 rounded-full",
                      isAdmin ? "bg-slate-700" : "bg-muted-foreground/30"
                    )} />
                  </div>

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
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {user.role}
                    </span>
                  </div>

                  {/* Settings links in dropdown */}
                  {settingsItems?.filter((item) => item.href).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm min-h-[44px] transition-colors md:py-2 md:min-h-0",
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

                  {/* Dashboard link - shown on mobile for regular users, always for admin variant */}
                  {!isAdmin && (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-3 text-sm min-h-[44px] text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Home className="h-4 w-4" strokeWidth={1.5} />
                      Dashboard
                    </Link>
                  )}

                  {isAdminUser && !isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-3 text-sm min-h-[44px] text-muted-foreground hover:bg-muted hover:text-foreground md:py-2 md:min-h-0"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" strokeWidth={1.5} />
                      Admin Panel
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-3 text-sm min-h-[44px] text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:py-2 md:min-h-0"
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
                        "flex w-full items-center gap-2 px-4 py-3 text-sm min-h-[44px] md:py-2 md:min-h-0",
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
