import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { OG_LABEL } from "@/lib/labels";

import type { OgIcon } from "./og-icons";

/**
 * The one visual for every link this app puts into a WhatsApp thread.
 *
 * Shared rather than written per route because the card IS the product in
 * that thread: someone forwards `/punto/…` into a group of forty people and
 * what forty people see is this, not the page. Six routes render it, and they
 * have to look like the same app or the link reads as spam.
 *
 * What varies between them is deliberately only two things — the accent
 * colour and the icon — so a thread carrying four of our links reads as four
 * messages from the same sender rather than four different products.
 *
 * Colours are hex, not the `oklch` tokens in globals.css: Satori (what
 * `ImageResponse` renders with) does not parse `oklch`, and a colour it
 * cannot parse comes out black on black. These are the same palette,
 * converted — if a token changes there, it has to change here too, which is
 * the price of the image being generated outside the browser.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Caching, and why every route repeats the same number.
 *
 * Each `opengraph-image.tsx` exports `revalidate = 3600` as a bare literal.
 * It cannot be imported from here: Next reads segment config exports by
 * static analysis before anything runs, and silently drops any value it
 * cannot see as a literal — which is worse than a duplicated number, because
 * the cache would just not happen.
 *
 * One hour, because the crawler that unfurls a link in a group waits a couple
 * of seconds and does not come back: the card has to already exist far more
 * often than not, and a link pasted into a relief group is forwarded, not
 * visited once. The cost is honesty with a deadline — a place that closes is
 * closed in the app instantly and in the preview within the hour, which is
 * the longest that felt defensible for a card that says "Abierto".
 */

const COLOR = {
  background: "#0e171d",
  backgroundTint: "#15242e",
  text: "#f4f7f8",
  muted: "#93a4ad",
  border: "#24343d",
  /** Matches `--unclaimed` / `--claimed` / `--resolved`: the same three-way
   *  status grammar the map draws, so a card and a pin agree. */
  unclaimed: "#c0433c",
  claimed: "#c58a2b",
  resolved: "#2f8f6d",
  neutral: "#5d7684",
} as const;

export type OgAccent = keyof Pick<
  typeof COLOR,
  "unclaimed" | "claimed" | "resolved" | "neutral"
>;

/** Satori parses `rgba()` reliably and 8-digit hex less so, so opacity on a
 *  palette colour goes through here rather than through a suffix. */
function alpha(hex: string, value: number): string {
  const int = Number.parseInt(hex.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${value})`;
}

/**
 * Inter, the font the rest of the product is set in, read off disk.
 *
 * `next/font` only ever produces woff2, which Satori cannot parse, so the
 * woff subsets are committed under `app/_fonts` — 29 KB each, latin only,
 * which is every character Spanish needs. Read from the filesystem and never
 * over the network: the crawler's patience is measured in seconds, and a
 * round trip to a font CDN is the kind of thing that turns a preview into a
 * bare link.
 *
 * Memoised in a module-level promise, so a warm server reads each file once
 * for the life of the process rather than once per card.
 */
let fontPromise: Promise<
  { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]
> | null = null;

export function ogFonts() {
  fontPromise ??= Promise.all([
    readFile(join(process.cwd(), "app/_fonts/Inter-Regular.woff")),
    readFile(join(process.cwd(), "app/_fonts/Inter-Bold.woff")),
  ]).then(([regular, bold]) => [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
  ]);

  return fontPromise;
}

/**
 * The mark in the footer, inlined.
 *
 * `app/icon.png` is a real file rather than a generated route, so it can be
 * read and embedded as a data URI with no request involved. Same memoisation
 * and the same reason as the fonts.
 */
let logoPromise: Promise<string> | null = null;

export function ogLogo() {
  logoPromise ??= readFile(join(process.cwd(), "app/icon.png")).then(
    (file) => `data:image/png;base64,${file.toString("base64")}`,
  );

  return logoPromise;
}

/**
 * Every element with more than one child sets `display: flex` explicitly —
 * Satori has no block layout, and an unset display silently drops all but
 * the first child rather than erroring.
 */
export function OgCard({
  eyebrow,
  title,
  meta,
  badge,
  icon: Icon,
  logo,
  accent = "neutral",
}: {
  /** What kind of thing this is, in caps — "ACOPIO", "GRUPO", "NECESIDAD". */
  eyebrow: string;
  title: string;
  /** The line that answers "where and when" — barrio, hours, freshness. */
  meta?: string;
  /** Status, in the colour of `accent`. Omitted when there is no state to
   *  report (the site-wide card). */
  badge?: string;
  /** The family's own glyph — the same shape its pins draw on the map, but
   *  redrawn server-side (see `og-icons.tsx`; importing Lucide here throws).
   *  Rendered enormous and faint behind the text, which is what makes the
   *  card legible as a thumbnail in a chat list, where the type is far too
   *  small to read. */
  icon?: OgIcon;
  /** Data URI from `ogLogo()`. Optional so a card can still render if the
   *  file ever moves. */
  logo?: string;
  accent?: OgAccent;
}) {
  const accentColor = COLOR[accent];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        // Not a flat fill: the diagonal lift is most of what separates this
        // from a card that looks like a screenshot of a terminal.
        backgroundImage: `linear-gradient(135deg, ${COLOR.background} 0%, ${COLOR.backgroundTint} 100%)`,
        color: COLOR.text,
        fontFamily: "Inter",
      }}
    >
      {/* The accent, as light rather than as a slab. It reads as the status
          from across a chat list — which is the job the old 20px bar was
          doing — without the card looking like it has a ruler taped to it. */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          top: -160,
          right: -220,
          width: 900,
          height: 900,
          backgroundImage: `radial-gradient(circle at center, ${alpha(
            accentColor,
            0.42,
          )} 0%, ${alpha(accentColor, 0.12)} 40%, ${alpha(accentColor, 0)} 66%)`,
        }}
      />

      {/* Bitten by the right edge on purpose: a glyph that runs off the frame
          reads as texture, and one sitting politely inside it reads as a
          sticker. */}
      {Icon && (
        <div
          style={{
            position: "absolute",
            display: "flex",
            top: 118,
            right: -56,
            opacity: 0.16,
          }}
        >
          <Icon size={392} color={accentColor} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "62px 72px 54px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                letterSpacing: 4,
                fontWeight: 700,
                color: accentColor,
              }}
            >
              {eyebrow.toUpperCase()}
            </div>

            {badge && (
              <div
                style={{
                  display: "flex",
                  marginLeft: 20,
                  padding: "8px 22px",
                  borderRadius: 999,
                  backgroundColor: alpha(accentColor, 0.16),
                  border: `2px solid ${alpha(accentColor, 0.55)}`,
                  color: accentColor,
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {badge}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 26,
              // Two thirds of the width, so a long name never runs under the
              // watermark and comes out unreadable.
              maxWidth: 800,
              fontSize: title.length > 60 ? 62 : 78,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              // Satori has no `line-clamp`; a long title is cut at the source
              // instead — see `ogTitle` below.
            }}
          >
            {title}
          </div>

          {meta && (
            <div
              style={{
                display: "flex",
                marginTop: 24,
                maxWidth: 800,
                fontSize: 32,
                color: COLOR.muted,
              }}
            >
              {meta}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 26,
            // The hairline picks up the accent instead of the neutral border:
            // it ties the bottom of the card to the light at the top of it.
            borderTop: `2px solid ${alpha(accentColor, 0.35)}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                width={46}
                height={46}
                style={{ marginRight: 16, borderRadius: 10 }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
                {OG_LABEL.siteName}
              </div>
              <div style={{ display: "flex", fontSize: 22, color: COLOR.muted }}>
                {OG_LABEL.tagline}
              </div>
            </div>
          </div>

          {/* Says there is something to do behind the picture. Somebody who
              has never opened this app is looking at an image in a chat, and
              nothing else on the card tells them it is an app at all. */}
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              color: accentColor,
            }}
          >
            {OG_LABEL.cta}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Satori cannot clamp, so an over-long title is cut here. Whole words, and
 *  an ellipsis so the cut is visibly a cut and not a bad name. */
export function ogTitle(text: string, max = 84): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
