import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_hsl(189_100%_51%/0.4)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_hsl(0_62%_50%/0.4)]",
        outline:
          "border border-border bg-card/50 text-foreground hover:bg-accent/10 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_hsl(0_0%_0%/0.2)]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:-translate-y-0.5 hover:shadow-[0_2px_12px_hsl(0_0%_0%/0.15)]",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-[hsl(var(--btn-success))] text-[hsl(var(--btn-success-foreground))] hover:bg-[hsl(var(--btn-success)/0.9)] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_hsl(189_80%_40%/0.4)]",
        danger:
          "bg-[hsl(var(--btn-danger))] text-[hsl(var(--btn-danger-foreground))] hover:bg-[hsl(var(--btn-danger)/0.9)] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_hsl(0_62%_50%/0.4)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  glow?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, glow = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          glow && "shadow-[0_0_20px_hsl(189_100%_51%/0.4),0_0_40px_hsl(189_100%_51%/0.15)]"
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
