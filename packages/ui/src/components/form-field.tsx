import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean;
  }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-(--text-sm) font-medium leading-none",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  >
    {children}
    {required && (
      <span
        className="ml-0.5 text-(--color-destructive)"
        aria-hidden="true"
        title="Obrigatório"
      >
        *
      </span>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export interface FormFieldProps {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  className,
  children,
}: FormFieldProps) {
  const descriptionId = id ? `${id}-description` : undefined;
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        disabled && "opacity-60",
        className,
      )}
    >
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}

      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(
          child as React.ReactElement<Record<string, unknown>>,
          {
            "aria-describedby": error
              ? errorId
              : hint
                ? descriptionId
                : undefined,
            "aria-invalid": error ? true : undefined,
            disabled:
              (child.props as Record<string, unknown>).disabled ?? disabled,
          },
        );
      })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-(--text-xs)"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={descriptionId}
          className="text-(--text-xs) leading-(--leading-relaxed)"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
FormField.displayName = "FormField";

export { FormField, Label };
