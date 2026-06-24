"use client";

import { forwardRef } from "react";

import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: [
    "bg-primary-600 text-white",
    "hover:bg-primary-700 active:bg-primary-800",
    "focus-visible:ring-primary-500",
    "disabled:bg-primary-300",
  ].join(" "),
  secondary: [
    "bg-white text-slate-800 border border-slate-300",
    "hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100",
    "focus-visible:ring-primary-500",
    "disabled:text-slate-400 disabled:border-slate-200",
  ].join(" "),
  ghost: [
    "text-slate-700",
    "hover:bg-slate-100 active:bg-slate-200",
    "focus-visible:ring-primary-500",
    "disabled:text-slate-400",
  ].join(" "),
  danger: [
    "bg-danger-600 text-white",
    "hover:bg-danger-700 active:bg-danger-800",
    "focus-visible:ring-danger-500",
    "disabled:bg-danger-300",
  ].join(" "),
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-10 px-5 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled ?? loading}
      className={cn(
        "inline-flex items-center justify-center font-medium tracking-tight transition-colors",
        "rounded-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
