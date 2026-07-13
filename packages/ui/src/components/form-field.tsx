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
      "text-sm font-medium leading-none",
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
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const descriptionId = hint ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy =
    [errorId, descriptionId].filter(Boolean).join(" ") || undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        disabled && "opacity-60",
        className,
      )}
    >
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}

      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        const childProps = child.props as Record<string, unknown>;
        return React.cloneElement(
          child as React.ReactElement<Record<string, unknown>>,
          {
            id: childProps.id ?? fieldId,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : undefined,
            "aria-required": required || undefined,
            required: childProps.required ?? required,
            disabled: childProps.disabled ?? disabled,
          },
        );
      })}

      {hint && (
        <p id={descriptionId} className="text-xs leading-(--leading-relaxed)">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          aria-live="polite"
          className="flex items-center gap-1 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
FormField.displayName = "FormField";

export { FormField, Label };
