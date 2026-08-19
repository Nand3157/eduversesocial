import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-sm font-medium outline-none transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ink text-background shadow-sm hover:-translate-y-px hover:shadow-md active:translate-y-0",
        secondary:
          "border border-borderSoft bg-card text-ink hover:border-mutedText/40 hover:bg-surface",
        ghost: "text-mutedText hover:bg-surface hover:text-ink",
        success: "bg-success text-background shadow-sm hover:-translate-y-px hover:shadow-md",
        accent: "bg-primary text-background shadow-sm hover:bg-primary-strong hover:-translate-y-px hover:shadow-md"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-full px-3.5 text-xs",
        icon: "h-10 w-10 rounded-full p-0"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/2 z-[-1] w-1/2 -skew-x-12 bg-white/20 opacity-0 transition-all duration-500 group-hover:left-[120%] group-hover:opacity-100" />
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
