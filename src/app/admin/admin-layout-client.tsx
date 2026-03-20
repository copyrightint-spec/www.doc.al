"use client";

import { AppShell } from "@/components/layout/app-shell";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return <AppShell variant="admin">{children}</AppShell>;
}
