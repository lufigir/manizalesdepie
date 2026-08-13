import type { NextConfig } from "next";

/**
 * Content-Security-Policy notes:
 *  - MapLibre compiles its style expressions with `new Function`, so the worker
 *    and script sources need `blob:` and `'unsafe-eval'` in development.
 *  - Basemap tiles come from CARTO, geocoding from Nominatim/Overpass, and
 *    aftershocks from the SGC; each host is named rather than wildcarded.
 */
const connectSources = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://basemaps.cartocdn.com",
  "https://*.basemaps.cartocdn.com",
  "https://nominatim.openstreetmap.org",
  "https://overpass-api.de",
  "https://datos.sgc.gov.co",
  "https://challenges.cloudflare.com",
].join(" ");

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  `worker-src 'self' blob:`,
  `child-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com`,
  `font-src 'self' data:`,
  `connect-src ${connectSources}`,
  `frame-src https://challenges.cloudflare.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            // Geolocation stays on: "ordenar por cercanía" is the whole point
            // of the volunteer mode.
            value: "camera=(), microphone=(), payment=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
