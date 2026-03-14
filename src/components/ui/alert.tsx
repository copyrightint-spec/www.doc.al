import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva(
  "flex items-center gap-3 rounded-xl border px-5 py-3.5",
  {
    variants: {
      variant: {
        info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
        warning: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20",
        success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
        destructive: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const iconColors = {
  info: "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-300",
  warning: "bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300",
  success: "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-300",
  destructive: "bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-300",
};

const textColors = {
  info: "text-blue-800 dark:text-blue-200",
  warning: "text-yellow-800 dark:text-yellow-200",
  success: "text-green-800 dark:text-green-200",
  destructive: "text-red-800 dark:text-red-200",
};

const subtextColors = {
  info: "text-blue-700 dark:text-blue-400",
  warning: "text-yellow-700 dark:text-yellow-400",
  success: "text-green-700 dark:text-green-400",
  destructive: "text-red-700 dark:text-red-400",
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export function Alert({ className, variant = "info", icon, title, description, ...props }: AlertProps) {
  const v = variant || "info";
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      {icon && (
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", iconColors[v])}>
          {icon}
        </div>
      )}
      <div className="flex-1">
        <p className={cn("text-sm font-semibold", textColors[v])}>{title}</p>
        {description && (
          <p className={cn("text-xs", subtextColors[v])}>{description}</p>
        )}
      </div>
    </div>
  );
}
