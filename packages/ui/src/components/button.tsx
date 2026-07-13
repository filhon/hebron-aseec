import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap",
    "rounded-(--radius) border border-transparent",
    "transition-[background-color,color,border-color,box-shadow] duration-(--transition-fast)",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-(--brand) focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none cursor-pointer",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-(--brand) text-(--brand-fg)",
          "hover:bg-(--hb-blue-soft)",
          "active:bg-(--hb-blue-deep)",
          "shadow-(--shadow-xs)",
        ],
        accent: [
          "bg-(--hb-orange-deep) text-(--fg-invert)",
          "hover:bg-(--hb-orange-darker)",
          "active:bg-(--hb-orange-darker)",
          "shadow-(--shadow-xs)",
        ],
        destructive: [
          "bg-(--color-destructive) text-(--color-destructive-foreground)",
          "hover:bg-(--color-destructive-hover)",
          "shadow-(--shadow-xs)",
        ],
        outline: [
          "border-(--border) bg-transparent text-(--fg)",
          "hover:border-(--brand) hover:text-(--brand)",
          "hover:bg-(--brand-muted)",
        ],
        secondary: [
          "bg-(--surface-alt) text-(--fg)",
          "border-(--border)",
          "hover:bg-(--hb-gray-100)",
        ],
        ghost: [
          "bg-transparent text-(--fg)",
          "hover:bg-(--surface-alt) hover:text-(--fg)",
        ],
        link: [
          "bg-transparent text-(--brand) underline-offset-4",
          "hover:underline",
          "h-auto px-0 py-0",
        ],
      },
      // xs/sm/icon-sm (28-32px): reservados para contextos densos (tabelas, toolbars).
      // Para CTAs primárias ou qualquer alvo tocável em mobile, usar md ou maior.
      size: {
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-base",
        xl: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        disabled={disabled ?? loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">Carregando</span>
          </>
        ) : (
          leftIcon
        )}
        <Slottable>{children}</Slottable>
        {!loading && rightIcon}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
