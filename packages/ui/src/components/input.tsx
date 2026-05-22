import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Estado de erro — aplica borda vermelha */
  hasError?: boolean;
  /** Ícone ou adorno à esquerda do campo */
  leftAdornment?: React.ReactNode;
  /** Ícone ou adorno à direita do campo */
  rightAdornment?: React.ReactNode;
}

const inputBaseClasses = [
  "flex w-full",
  "rounded-[--radius] border border-[--color-border]",
  "bg-[--color-input-bg] text-[--color-foreground]",
  "px-3 py-2",
  "text-[--text-sm] font-[--font-ui]",
  "leading-[--leading-normal]",
  "placeholder:text-[--color-muted-foreground]",
  "transition-colors duration-[--transition-fast]",
  // Hover
  "hover:border-[--color-primary]/50",
  // Focus
  "focus-visible:outline-none",
  "focus-visible:border-[--color-primary]",
  "focus-visible:ring-2 focus-visible:ring-[--color-ring]/20",
  // Disabled
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[--color-muted]",
  // File input
  "file:border-0 file:bg-transparent file:text-[--text-sm] file:font-medium file:text-[--color-foreground]",
].join(" ");

const inputErrorClasses = [
  "border-[--color-destructive]",
  "hover:border-[--color-destructive]",
  "focus-visible:border-[--color-destructive]",
  "focus-visible:ring-[--color-destructive]/20",
].join(" ");

/**
 * Campo de entrada de texto básico.
 *
 * Para formulários, use em conjunto com `FormField`.
 */
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
          <div className="pointer-events-none absolute left-3 flex items-center text-[--color-muted-foreground]">
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
          <div className="pointer-events-none absolute right-3 flex items-center text-[--color-muted-foreground]">
            {rightAdornment}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
