// ——————————————————————————————————————
// Hebron Aseec — Design System
// packages/ui
//
// Importar tokens no CSS do app:
//   @import "@hebron/ui/tokens.css";
//
// Tipografia via next/font (no layout.tsx de cada app):
//   import { Parkinsans, Titillium_Web } from 'next/font/google'
//   const parkinsans = Parkinsans({
//     subsets: ['latin'],
//     variable: '--font-parkinsans',
//   })
//   const titillium = Titillium_Web({
//     subsets: ['latin'], weight: ['400', '600', '700'],
//     variable: '--font-titillium',
//   })
//   <html className={`${parkinsans.variable} ${titillium.variable}`}>
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
  LinkComponent,
} from "./components/navigation-sidebar";

export { PageHeader } from "./components/page-header";
export type { PageHeaderProps, BreadcrumbItem } from "./components/page-header";

export { BrandMark } from "./components/brand-mark";
export type { BrandMarkProps } from "./components/brand-mark";

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
