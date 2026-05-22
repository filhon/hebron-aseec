"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ToastProvider = ToastPrimitive.Provider;

// ——————————————————————————————————————
// Viewport (onde os toasts aparecem na tela)
// ——————————————————————————————————————

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[--z-toast]",
      "flex max-h-screen w-full flex-col-reverse gap-2",
      "p-4",
      "sm:bottom-4 sm:right-4 sm:max-w-sm",
      "md:max-w-md",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

// ——————————————————————————————————————
// Variantes
// ——————————————————————————————————————

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-start gap-3",
    "overflow-hidden rounded-[--radius-md]",
    "border p-4",
    "shadow-[--shadow-lg]",
    "transition-all duration-[--transition-medium]",
    // Animações de entrada/saída
    "data-[swipe=cancel]:translate-x-0",
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
    "data-[state=open]:slide-in-from-bottom-full",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-[--color-background] border-[--color-border]",
          "text-[--color-foreground]",
        ],
        success: [
          "bg-[--color-support-green-muted] border-[--color-support-green]",
          "text-[--color-support-green-foreground]",
        ],
        destructive: [
          "bg-[--color-destructive-muted] border-[--color-destructive]",
          "text-[--color-destructive]",
        ],
        warning: [
          "bg-[--color-accent-muted] border-[--color-accent]",
          "text-[--color-accent]",
        ],
        info: [
          "bg-[--color-support-sky-muted] border-[--color-support-sky]",
          "text-[--color-support-sky-foreground]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Ícones por variante
const toastIcons: Record<string, React.ReactNode> = {
  success: (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[--color-support-green]" />
  ),
  destructive: (
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[--color-destructive]" />
  ),
  warning: (
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[--color-accent]" />
  ),
  info: <Info className="mt-0.5 h-4 w-4 shrink-0 text-[--color-support-sky]" />,
  default: null,
};

// ——————————————————————————————————————
// Toast
// ——————————————————————————————————————

export interface ToastProps
  extends
    React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, variant, children, ...props }, ref) => {
  const icon = toastIcons[variant ?? "default"];

  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {icon}
      <div className="flex flex-1 flex-col gap-0.5">{children}</div>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;

// ——————————————————————————————————————
// Partes compostas
// ——————————————————————————————————————

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      "inline-flex shrink-0 items-center justify-center",
      "rounded-[--radius-sm] border border-[--color-border]",
      "bg-transparent px-3 py-1.5",
      "text-[--text-xs] font-medium",
      "transition-colors duration-[--transition-fast]",
      "hover:bg-[--color-muted]",
      "focus:outline-none focus:ring-2 focus:ring-[--color-ring] focus:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitive.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    toast-close=""
    className={cn(
      "absolute right-2 top-2",
      "flex h-6 w-6 shrink-0 items-center justify-center",
      "rounded-[--radius-sm]",
      "text-[--color-muted-foreground]",
      "transition-colors duration-[--transition-fast]",
      "hover:bg-black/10 hover:text-[--color-foreground]",
      "focus:outline-none focus:ring-2 focus:ring-[--color-ring]",
      "opacity-0 group-hover:opacity-100",
      className,
    )}
    aria-label="Fechar notificação"
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn(
      "text-[--text-sm] font-semibold leading-[--leading-tight]",
      className,
    )}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn(
      "text-[--text-xs] leading-[--leading-relaxed] opacity-90",
      className,
    )}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

// ——————————————————————————————————————
// Tipos utilitários
// ——————————————————————————————————————

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
