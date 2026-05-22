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
