import * as React from "react";
import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  valueColor?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-slate-500",
  iconBg = "bg-slate-100 dark:bg-slate-800",
  valueColor = "text-foreground",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-border bg-card p-5",
        className
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-bold", valueColor)}>{value}</p>
      </div>
    </div>
  );
}
