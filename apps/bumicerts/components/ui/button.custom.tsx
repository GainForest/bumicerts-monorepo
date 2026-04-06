"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// Pick only the Framer Motion-specific props (not ones that conflict with HTML button events)
type MotionOnlyProps = Pick<
  HTMLMotionProps<"button">,
  | "initial"
  | "animate"
  | "exit"
  | "variants"
  | "whileHover"
  | "whileTap"
  | "whileFocus"
  | "whileDrag"
  | "whileInView"
  | "layoutId"
  | "layoutRoot"
  | "layout"
  | "transition"
>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    MotionOnlyProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-xs";
  asChild?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  outline:
    "border border-border bg-background shadow-sm hover:bg-muted hover:text-foreground",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "hover:bg-muted hover:text-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-10 px-8 text-base",
  icon: "h-9 w-9",
  "icon-sm": "h-7 w-7",
  "icon-xs": "size-6 rounded-md",
};

/**
 * Utility function that returns Tailwind classes for a button variant.
 * Compatible with shadcn components (e.g. calendar.tsx) that call buttonVariants({ variant }).
 */
export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonProps["variant"];
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-xs";
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
    variantClasses[variant ?? "default"],
    sizeClasses[size ?? "default"],
    className
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", children, whileTap, transition, initial, animate, exit, variants, whileHover, whileFocus, whileDrag, whileInView, layoutId, layoutRoot, layout, ...props },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={whileTap ?? { scale: 0.97 }}
        transition={transition ?? { type: "spring", stiffness: 400, damping: 25 }}
        initial={initial}
        animate={animate}
        exit={exit}
        variants={variants}
        whileHover={whileHover}
        whileFocus={whileFocus}
        whileDrag={whileDrag}
        whileInView={whileInView}
        layoutId={layoutId}
        layoutRoot={layoutRoot}
        layout={layout}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button };
