import { cn } from "@/lib/cn";

interface SpinnerProps {
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function Spinner({ size = "default", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border",
    default: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-2",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300",
        sizeClasses[size],
        className
      )}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}
