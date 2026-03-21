"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { X, ChevronDown, Settings, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { type NavItem, type NavChild } from "./nav-items";

interface SidebarProps {
  navItems: NavItem[];
  settingsItems?: NavItem[];
  variant?: "default" | "admin";
  sidebarOpen: boolean;
  onClose: () => void;
  bottomContent?: React.ReactNode;
}

export function Sidebar({
  navItems,
  settingsItems,
  variant = "default",
  sidebarOpen,
  onClose,
  bottomContent,
}: SidebarProps) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(
    settingsItems?.some((item) => item.href && pathname.startsWith(item.href)) ?? false
  );

  // Track which expandable nav groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) => pathname.startsWith(child.href));
        if (isChildActive) initial[item.label] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isAdmin = variant === "admin";

  const isActive = (href: string, isRoot?: boolean) => {
    if (isRoot) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const rootHref = navItems[0]?.href || "/dashboard";
  const isRootItem = (href: string) => href === rootHref;

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isAdmin
            ? "border-slate-800 bg-slate-900"
            : "border-border bg-card"
        )}
      >
        {/* Brand */}
        <div className={cn(
          "flex h-16 shrink-0 items-center justify-between border-b px-6",
          isAdmin ? "border-slate-800" : "border-border"
        )}>
          <Link href={isAdmin ? "/admin" : "/"} className="flex items-center gap-2.5">
            <Image src="/docal-icon.png" unoptimized alt="doc.al" width={40} height={40} className="h-10 w-10" />
            <span className={cn("text-2xl font-bold", isAdmin ? "text-white" : "text-foreground")}>
              doc<span className="text-blue-600">.al</span>
            </span>
            {isAdmin && (
              <span className="rounded-md bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Admin
              </span>
            )}
          </Link>
          <button className="lg:hidden" onClick={onClose}>
            <X className={cn("h-5 w-5", isAdmin ? "text-slate-500" : "text-muted-foreground")} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col justify-between overflow-y-auto">
          <div className="space-y-1 p-4">
            {navItems.map((item) => {
              // Items with children render as expandable group
              if (item.children) {
                const isGroupActive = item.children.some((child) => isActive(child.href));
                const isOpen = openGroups[item.label] ?? false;
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        isGroupActive
                          ? isAdmin
                            ? "font-medium text-white"
                            : "font-medium text-foreground"
                          : isAdmin
                            ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          isOpen ? "rotate-180" : ""
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onClose}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                childActive
                                  ? isAdmin
                                    ? "font-medium text-white"
                                    : "font-medium text-foreground"
                                  : isAdmin
                                    ? "text-slate-400 hover:text-slate-100"
                                    : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular flat nav item
              const active = isActive(item.href!, isRootItem(item.href!));
              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? isAdmin
                        ? "bg-slate-800 font-medium text-white"
                        : "bg-slate-900 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                      : isAdmin
                        ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}

            {/* Settings collapsible group */}
            {settingsItems && settingsItems.length > 0 && (
              <div className="pt-4">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    settingsItems.some((item) => item.href && isActive(item.href))
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                  Cilesimet
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      settingsOpen ? "rotate-180" : ""
                    )}
                  />
                </button>

                {settingsOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                    {settingsItems.map((item) => {
                      const active = item.href ? isActive(item.href) : false;
                      return (
                        <Link
                          key={item.href || item.label}
                          href={item.href || "#"}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            active
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom content */}
          {(bottomContent || isAdmin) && (
            <div className={cn(
              "shrink-0 border-t p-4",
              isAdmin ? "border-slate-800" : "border-border"
            )}>
              {isAdmin && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-100"
                >
                  <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  Kthehu ne Dashboard
                </Link>
              )}
              {bottomContent}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
