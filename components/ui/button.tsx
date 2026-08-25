import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-sm font-medium outline-none touch-manipulation transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
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
        default: "h-11 px-5 min-h-[44px]",
        sm: "h-10 min-h-[44px] min-w-[44px] rounded-full px-3.5 text-xs",
        icon: "h-11 w-11 rounded-full p-0 min-h-[44px] min-w-[44px]"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

const SHEEN =
  "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-[-1] before:w-1/2 before:-translate-x-full before:-skew-x-12 before:bg-background/20 before:opacity-0 before:content-[''] before:transition-[transform,opacity] before:duration-500 before:ease-out group-hover:before:translate-x-[240%] group-hover:before:opacity-100";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), SHEEN, className)} ref={ref} {...props}>
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
