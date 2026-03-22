import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground rounded-xl hover:opacity-90",
        secondary:
          "bg-secondary text-secondary-foreground border border-border rounded-xl hover:bg-muted",
        ghost:
          "rounded-xl hover:bg-muted text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground rounded-xl hover:opacity-90",
        link:
          "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 md:h-8 px-3 text-xs",
        default: "h-12 md:h-10 px-5 py-2",
        lg: "h-14 md:h-12 px-8 py-3 text-base",
        icon: "h-12 w-12 md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
