import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
}

const inputBaseClasses = [
  "flex w-full",
  "rounded-(--radius) border border-(--border)",
  "bg-(--bg-alt) text-(--fg)",
  "px-3 py-2",
  "text-(--text-sm) font-(--font-body)",
  "leading-(--leading-normal)",
  "placeholder:text-(--fg-muted)",
  "transition-colors duration-(--transition-fast)",
  "hover:border-(--brand)/50",
  "focus-visible:outline-none",
  "focus-visible:border-(--brand)",
  "focus-visible:ring-2 focus-visible:ring-(--brand)/20",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-(--surface-alt)",
  "file:border-0 file:bg-transparent file:text-(--text-sm) file:font-medium file:text-(--fg)",
].join(" ");

const inputErrorClasses = [
  "border-(--color-destructive)",
  "hover:border-(--color-destructive)",
  "focus-visible:border-(--color-destructive)",
  "focus-visible:ring-(--color-destructive)/20",
].join(" ");

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      hasError = false,
      leftAdornment,
      rightAdornment,
      type,
      ...props
    },
    ref,
  ) => {
    const hasAdornment =
      leftAdornment !== undefined || rightAdornment !== undefined;

    if (!hasAdornment) {
      return (
        <input
          ref={ref}
          type={type}
          className={cn(
            inputBaseClasses,
            hasError && inputErrorClasses,
            "h-10",
            className,
          )}
          {...props}
        />
      );
    }

    return (
      <div className="relative flex items-center">
        {leftAdornment && (
          <div className="pointer-events-none absolute left-3 flex items-center text-(--fg-muted)">
            {leftAdornment}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            inputBaseClasses,
            hasError && inputErrorClasses,
            "h-10",
            leftAdornment && "pl-9",
            rightAdornment && "pr-9",
            className,
          )}
          {...props}
        />
        {rightAdornment && (
          <div className="pointer-events-none absolute right-3 flex items-center text-(--fg-muted)">
            {rightAdornment}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
