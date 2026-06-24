"use client";

import { forwardRef } from "react";
import { cn } from "./cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | undefined;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, className, id, ...props },
  ref,
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="ml-1 text-danger-600">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          "h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900",
          "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500",
          "disabled:cursor-not-allowed disabled:bg-gray-50",
          error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
});
