"use client";

import { forwardRef } from "react";
import { cn } from "./cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftAddon, rightAddon, className, id, ...props },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="ml-1 text-danger-600">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftAddon && (
          <div className="pointer-events-none absolute left-3 text-gray-400">{leftAddon}</div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
            error
              ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500"
              : "border-gray-300 focus:border-primary-500",
            leftAddon && "pl-9",
            rightAddon && "pr-9",
            className,
          )}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 text-gray-400">{rightAddon}</div>
        )}
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
});
