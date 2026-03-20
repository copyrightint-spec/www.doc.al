"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { type NavItem, dashboardNav, settingsNav, adminNav } from "./nav-items";

interface UserSession {
  role: string;
  name: string;
  email: string;
  image?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  variant?: "dashboard" | "admin";
}

export function AppShell({ children, variant = "dashboard" }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          const role = data.user.role || "USER";
          setUserSession({
            role,
            name: data.user.name || "",
            email: data.user.email || "",
            image: data.user.image || undefined,
          });

          // Client-side guard: redirect non-admin users away from admin pages
          if (variant === "admin" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
            router.replace("/dashboard");
          }
        }
      })
      .catch(() => {});
  }, [variant, router]);

  const isAdmin = variant === "admin";
  const navItems: NavItem[] = isAdmin ? adminNav : dashboardNav;

  // Determine current page title
  const allItems = [...navItems, ...(isAdmin ? [] : settingsNav)];
  const currentPage = allItems.find((item) => {
    const rootHref = navItems[0]?.href || "/dashboard";
    if (item.href === rootHref) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  });

  const title = currentPage?.label || (isAdmin ? "Admin" : "Dashboard");

  return (
    <div className={cn("flex min-h-screen", isAdmin ? "bg-slate-950" : "bg-background")}>
      <Sidebar
        navItems={navItems}
        settingsItems={isAdmin ? undefined : settingsNav}
        variant={isAdmin ? "admin" : "default"}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Header
        title={title}
        user={userSession}
        variant={isAdmin ? "admin" : "default"}
        settingsItems={isAdmin ? undefined : settingsNav}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <main className="flex-1 pt-14 lg:ml-[260px]">
        {children}
      </main>
    </div>
  );
}
