import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  // Base
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap",
    "rounded-[--radius] border border-transparent",
    "transition-all duration-[--transition-fast]",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-[--color-ring] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none cursor-pointer",
  ],
  {
    variants: {
      variant: {
        // Azul institucional — ação principal
        default: [
          "bg-[--color-primary] text-[--color-primary-foreground]",
          "hover:bg-[--color-primary-hover]",
          "active:bg-[--color-primary-active]",
          "shadow-[--shadow-xs]",
        ],
        // Laranja — destaque / chamada para ação secundária
        accent: [
          "bg-[--color-accent] text-[--color-accent-foreground]",
          "hover:bg-[--color-accent-hover]",
          "active:bg-[--color-accent-active]",
          "shadow-[--shadow-xs]",
        ],
        // Destrutiva
        destructive: [
          "bg-[--color-destructive] text-[--color-destructive-foreground]",
          "hover:bg-[--color-destructive-hover]",
          "shadow-[--shadow-xs]",
        ],
        // Borda com cor primária
        outline: [
          "border-[--color-border] bg-transparent text-[--color-foreground]",
          "hover:border-[--color-primary] hover:text-[--color-primary]",
          "hover:bg-[--color-primary-muted]",
        ],
        // Borda primária com fundo muted
        secondary: [
          "bg-[--color-muted] text-[--color-foreground]",
          "border-[--color-border]",
          "hover:bg-[--color-subtle]",
        ],
        // Sem fundo, sem borda
        ghost: [
          "bg-transparent text-[--color-foreground]",
          "hover:bg-[--color-muted] hover:text-[--color-foreground]",
        ],
        // Apenas texto, parece link
        link: [
          "bg-transparent text-[--color-primary] underline-offset-4",
          "hover:underline",
          "h-auto px-0 py-0",
        ],
      },
      size: {
        xs: "h-7 px-2.5 text-[--text-xs]",
        sm: "h-8 px-3 text-[--text-sm]",
        md: "h-10 px-4 text-[--text-sm]",
        lg: "h-11 px-5 text-[--text-base]",
        xl: "h-12 px-6 text-[--text-base]",
        // Ícone apenas — quadrado
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
  /** Renderiza como filho (para usar com link, etc.) */
  asChild?: boolean;
  /** Exibe spinner e desabilita o botão */
  loading?: boolean;
  /** Ícone à esquerda do texto */
  leftIcon?: React.ReactNode;
  /** Ícone à direita do texto */
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
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
