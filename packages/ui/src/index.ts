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
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerOverlay,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "./components/drawer";
export type { DrawerSide } from "./components/drawer";

export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./components/tooltip";

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

export { RichTextEditor } from "./components/rich-text-editor";
export type { RichTextEditorProps } from "./components/rich-text-editor";

export { RichText, sanitizeRichText } from "./components/rich-text";
export type { RichTextProps } from "./components/rich-text";

export { CommandMenu } from "./components/command-menu";
export type {
  CommandMenuProps,
  CommandMenuItem,
} from "./components/command-menu";

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

export {
  ECOSYSTEM_APPS,
  getAppShortcuts,
  getAdminUrl,
  resolveNotificationHref,
} from "./components/ecosystem-apps";

// Marca institucional
export { BrandMark } from "./components/brand-mark";
export type { BrandMarkProps } from "./components/brand-mark";

export { HebronSymbol, HebronLockup } from "./components/hebron-brand";
export type {
  BrandTone,
  HebronSymbolProps,
  HebronLockupProps,
} from "./components/hebron-brand";

// Sub-marcas dos módulos
export { MODULE_BRANDS, MODULE_IDS } from "./components/module-brands";
export type { ModuleId, ModuleBrand } from "./components/module-brands";

export { ModuleLogo, ModuleGlyph } from "./components/module-logo";
export type {
  ModuleLogoProps,
  ModuleLogoVariant,
} from "./components/module-logo";

export {
  moduleIconElement,
  MODULE_ICON_SIZE,
  MODULE_ICON_CONTENT_TYPE,
} from "./components/module-icon";

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

// Impersonation
export { ImpersonationBanner } from "./components/impersonation-banner";
export type { ImpersonationBannerProps } from "./components/impersonation-banner";

// Notifications
export { NotificationBell } from "./components/notification-bell";
export type {
  NotificationBellProps,
  NotificationItem,
} from "./components/notification-bell";

export { NotificationCenter } from "./components/notification-center";
export type { NotificationCenterProps } from "./components/notification-center";

export { NotificationBellContainer } from "./components/notification-bell-container";
export type {
  NotificationBellContainerProps,
  NotificationBellListResult,
} from "./components/notification-bell-container";

export { NotificationCenterContainer } from "./components/notification-center-container";
export type {
  NotificationCenterContainerProps,
  NotificationCenterListResult,
} from "./components/notification-center-container";

// LGPD — superfície de titular (P-9.2)
export { MyDataPage } from "./components/my-data-page";
export type {
  MyDataPageProps,
  MyDataProfileView,
  MyDataConsentView,
  MyDataExportFile,
  MyDataDeletionStatus,
} from "./components/my-data-page";
