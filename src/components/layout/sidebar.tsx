"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, Settings, ArrowLeft, MoreHorizontal } from "lucide-react";
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

/** Badge counts keyed by badgeKey (e.g. { contacts: 3 }) */
type BadgeCounts = Record<string, number>;

/* ------------------------------------------------------------------ */
/*  Mobile bottom nav config                                          */
/* ------------------------------------------------------------------ */

/** Pick at most 4 "primary" items for the bottom bar; the rest go into "More" */
function splitMobileNav(navItems: NavItem[], settingsItems?: NavItem[]) {
  // For items with children, use the first child href
  const flatItems = navItems.map((item) => ({
    ...item,
    href: item.href ?? item.children?.[0]?.href ?? "#",
  }));

  const primary = flatItems.slice(0, 4);
  const overflow = [
    ...flatItems.slice(4),
    ...(settingsItems ?? []).map((s) => ({ ...s, href: s.href ?? "#" })),
  ];
  return { primary, overflow };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

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
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({});

  // Fetch notification badge counts for admin sidebar
  useEffect(() => {
    if (variant !== "admin") return;
    const fetchBadges = () => {
      fetch("/api/admin/notifications")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setBadgeCounts(data.data);
        })
        .catch(() => {});
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, [variant]);

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

  const isActive = useCallback(
    (href: string, isRoot?: boolean) => {
      if (isRoot) return pathname === href;
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  const rootHref = navItems[0]?.href || "/dashboard";
  const isRootItem = (href: string) => href === rootHref;

  // Close more-sheet on route change
  useEffect(() => {
    setMoreSheetOpen(false);
  }, [pathname]);

  const { primary: mobilePrimary, overflow: mobileOverflow } = splitMobileNav(navItems, settingsItems);

  return (
    <>
      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR (>= md)                                      */}
      {/* ============================================================ */}

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r transition-transform md:flex lg:translate-x-0",
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
                  <div key={item.label} data-onboarding={item.label === "eSign" ? "esign-menu" : undefined}>
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
              const badgeCount = item.badgeKey ? (badgeCounts[item.badgeKey] || 0) : 0;
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
                  {badgeCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Settings collapsible group */}
            {settingsItems && settingsItems.length > 0 && (
              <div className="pt-4" data-onboarding="settings-menu">
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

      {/* ============================================================ */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< md)                          */}
      {/* ============================================================ */}

      {/* More sheet backdrop */}
      {moreSheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMoreSheetOpen(false)}
        />
      )}

      {/* More sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 md:hidden transition-transform duration-300 ease-out",
          moreSheetOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div
          className={cn(
            "rounded-t-2xl border-t pb-[calc(env(safe-area-inset-bottom)+72px)]",
            isAdmin
              ? "border-slate-800 bg-slate-900"
              : "border-border bg-card"
          )}
        >
          {/* Sheet handle */}
          <div className="flex justify-center py-3">
            <div className={cn(
              "h-1 w-10 rounded-full",
              isAdmin ? "bg-slate-700" : "bg-muted-foreground/30"
            )} />
          </div>

          {/* Sheet nav items */}
          <nav className="space-y-1 px-4 pb-4">
            {mobileOverflow.map((item) => {
              const href = item.href ?? "#";
              const active = href !== "#" && isActive(href, isRootItem(href));
              return (
                <Link
                  key={href + item.label}
                  href={href}
                  onClick={() => setMoreSheetOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-sm transition-colors",
                    active
                      ? isAdmin
                        ? "bg-slate-800 font-medium text-white"
                        : "bg-slate-900 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                      : isAdmin
                        ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                  {item.label}
                  {item.badgeKey && (badgeCounts[item.badgeKey] || 0) > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                      {(badgeCounts[item.badgeKey!] || 0) > 99 ? "99+" : badgeCounts[item.badgeKey!]}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Back to dashboard link for admin */}
            {isAdmin && (
              <Link
                href="/dashboard"
                onClick={() => setMoreSheetOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-sm text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-100"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                Kthehu ne Dashboard
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t backdrop-blur-lg",
          isAdmin
            ? "border-slate-800 bg-slate-900/95"
            : "border-border bg-card/95"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobilePrimary.map((item) => {
          const href = item.href ?? "#";
          // For items with children, check if any child is active
          const active = item.children
            ? item.children.some((c) => isActive(c.href))
            : isActive(href, isRootItem(href));
          return (
            <Link
              key={href + item.label}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors",
                active
                  ? "text-blue-500"
                  : isAdmin
                    ? "text-slate-500"
                    : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* "More" button */}
        {mobileOverflow.length > 0 && (
          <button
            onClick={() => setMoreSheetOpen(!moreSheetOpen)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors",
              moreSheetOpen
                ? "text-blue-500"
                : isAdmin
                  ? "text-slate-500"
                  : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={moreSheetOpen ? 2 : 1.5} />
            <span className="text-[10px] font-medium leading-tight">Me shume</span>
          </button>
        )}
      </nav>
    </>
  );
}
