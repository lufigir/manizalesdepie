import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Inter, self-hosted at build time by next/font — no request ever leaves for
 * Google, which keeps the CSP in next.config.ts closed and costs no round trip
 * on a phone with one bar of signal.
 *
 * "latin-ext" is not optional: without it the map loses the tildes in
 * Villamaría, Milán and Bogotá, and the ñ.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Manizales de Pie",
    template: "%s · Manizales de Pie",
  },
  description:
    "Mapa en vivo de la ayuda tras el sismo del 10 de agosto: dónde se necesita, qué se necesita y qué no recibir. Manizales y Villamaría.",
  applicationName: "Manizales de Pie",
  openGraph: {
    title: "Manizales de Pie",
    description:
      "Dónde ayudar hoy en Manizales y Villamaría: acopios, albergues, sangre, animales y vías cerradas.",
    locale: "es_CO",
    type: "website",
  },
};

export const viewport: Viewport = {
  // The map fills the screen and the sheet slides over it; letting the user
  // zoom the whole page would fight the map's own gestures.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e171d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
