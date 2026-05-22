// ——————————————————————————————————————
// Hebron Aseec — Design System
// packages/ui
//
// Importar tokens no CSS do app:
//   @import "@hebron/ui/tokens.css";
//
// Tipografia via next/font (no layout.tsx de cada app):
//   import { Inter, Source_Serif_4 } from 'next/font/google'
//   const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
//   const serif = Source_Serif_4({
//     subsets: ['latin'], weight: ['400', '600', '700'],
//     variable: '--font-source-serif-4',
//   })
//   <html className={`${inter.variable} ${serif.variable}`}>
// ——————————————————————————————————————

// Primitivos
export { Button, buttonVariants } from "./components/button";
export type { ButtonProps } from "./components/button";

export { Input } from "./components/input";
export type { InputProps } from "./components/input";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./components/select";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./components/toast";
export type { ToastProps, ToastActionElement } from "./components/toast";

export { FormField, Label } from "./components/form-field";
export type { FormFieldProps } from "./components/form-field";

// Layout
export { AppShell } from "./components/app-shell";
export type { AppShellProps } from "./components/app-shell";

export { NavigationSidebar } from "./components/navigation-sidebar";
export type {
  NavigationSidebarProps,
  NavSection,
  NavItem,
  AppShortcut,
} from "./components/navigation-sidebar";

export { PageHeader } from "./components/page-header";
export type { PageHeaderProps, BreadcrumbItem } from "./components/page-header";

export { UserMenu, Avatar } from "./components/user-menu";
export type {
  UserMenuProps,
  UserMenuUser,
  AvatarProps,
} from "./components/user-menu";

// States
export { EmptyState } from "./components/empty-state";
export type { EmptyStateProps, BibleQuote } from "./components/empty-state";

export { ErrorState } from "./components/error-state";
export type { ErrorStateProps } from "./components/error-state";

export { LoadingState } from "./components/loading-state";
export type { LoadingStateProps } from "./components/loading-state";

// Notifications
export { NotificationBell } from "./components/notification-bell";
export type {
  NotificationBellProps,
  NotificationItem,
} from "./components/notification-bell";

export { NotificationCenter } from "./components/notification-center";
export type { NotificationCenterProps } from "./components/notification-center";
