import type { NextConfig } from "next";

/**
 * Content-Security-Policy notes:
 *  - MapLibre compiles its style expressions with `new Function`, so the worker
 *    and script sources need `blob:` and `'unsafe-eval'` in development.
 *  - The only host left is CARTO, for the basemap tiles. Supabase used to be
 *    here twice — https for PostgREST and Storage, wss for the realtime
 *    channel — and both went with the database.
 */
const connectSources = [
  "'self'",
  "https://basemaps.cartocdn.com",
  "https://*.basemaps.cartocdn.com",
].join(" ");

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  `worker-src 'self' blob:`,
  `child-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline'`,
  // The animal photos are committed under /public now, so 'self' covers
  // them. `data:` is what a photo added during a visit arrives as, and
  // `blob:` is the preview the report form shows while it is being chosen.
  `img-src 'self' data: blob: https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com`,
  `font-src 'self' data:`,
  `connect-src ${connectSources}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join("; ");

const nextConfig: NextConfig = {
  // The dev server otherwise refuses cross-origin requests for its internal
  // assets, which is exactly what opening `http://192.168.1.136:3000` from a
  // phone on the same wifi is. Development only — `next build` ignores it —
  // and the whole point of this app is how it behaves on a phone, so testing
  // it on a real one is not optional.
  allowedDevOrigins: ["192.168.1.136"],

  /**
   * `public/barrios.geojson` is read at request time by `lib/demo/dataset.ts`
   * — it is what stamps the barrio on every pin, the job PostGIS used to do.
   * Nothing imports it, so the file tracer cannot know a server render needs
   * it, and its absence would silently turn every barrio into "no barrio".
   */
  outputFileTracingIncludes: {
    "/*": ["./public/barrios.geojson"],
  },

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
