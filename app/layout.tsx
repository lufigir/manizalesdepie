import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { clientEnv } from "@/lib/env";

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

const DESCRIPTION =
  "Mapa en vivo de la ayuda tras el sismo del 10 de agosto: dónde se necesita, qué se necesita y qué no recibir. Manizales y Villamaría.";

export const metadata: Metadata = {
  /**
   * Required, not optional polish: every `opengraph-image.tsx` in this app
   * resolves to a RELATIVE URL, and without a base Next cannot turn that
   * into the absolute one WhatsApp and Twitter demand — the card silently
   * renders with no image at all, which is the failure mode nobody notices
   * until a link is already circulating.
   */
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "Manizales de Pie",
    template: "%s · Manizales de Pie",
  },
  description: DESCRIPTION,
  applicationName: "Manizales de Pie",
  authors: [{ name: "Manizales de Pie" }],
  // What someone actually types into a search box during this. Not a
  // keyword-stuffing list — six phrases that are real searches.
  keywords: [
    "sismo Manizales",
    "ayuda Manizales",
    "acopio Manizales",
    "albergue Manizales",
    "donar sangre Manizales",
    "Villamaría",
  ],
  openGraph: {
    siteName: "Manizales de Pie",
    title: "Manizales de Pie",
    // Kept in step with the entities the map actually draws. It used to
    // advertise "vías cerradas", which stopped existing on 14 August — a
    // shared link promising something the app no longer has is worse than
    // a shorter list.
    description:
      "Dónde ayudar hoy en Manizales y Villamaría: acopios, albergues, donación de sangre, grupos, necesidades y mascotas.",
    url: clientEnv.NEXT_PUBLIC_SITE_URL,
    locale: "es_CO",
    type: "website",
  },
  // `summary_large_image` rather than the default: the card carries a
  // status colour and a barrio, and at thumbnail size neither is readable.
  twitter: {
    card: "summary_large_image",
    title: "Manizales de Pie",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: {
    // Every card already offers WhatsApp and a tel: link where one exists.
    // Left on, Safari also underlines every barrio name that looks like an
    // address and turns the panel into a field of blue links.
    telephone: false,
    address: false,
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
