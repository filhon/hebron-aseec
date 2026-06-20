import type { Metadata } from "next";
import { Parkinsans, Titillium_Web } from "next/font/google";
import "./globals.css";

const parkinsans = Parkinsans({
  subsets: ["latin"],
  variable: "--font-parkinsans",
  display: "swap",
  adjustFontFallback: false,
});

const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-titillium",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "hebron documentos",
    template: "%s · hebron documentos",
  },
  description:
    "Portal de documentos, editais e chamadas da Hebron Aseec. Documentação institucional, políticas e oportunidades de submissão.",
  openGraph: {
    siteName: "hebron documentos",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${parkinsans.variable} ${titillium.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
