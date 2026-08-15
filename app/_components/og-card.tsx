import { OG_LABEL } from "@/lib/labels";

/**
 * The one visual for every link this app puts into a WhatsApp thread.
 *
 * Shared rather than written per route because the card IS the product in
 * that thread: someone forwards `/punto/…` into a group of forty people and
 * what forty people see is this, not the page. Three routes render it — the
 * site link, the grupo link, and the site itself — and they have to look
 * like the same app or the link reads as spam.
 *
 * Colours are hex, not the `oklch` tokens in globals.css: Satori (what
 * `ImageResponse` renders with) does not parse `oklch`, and a colour it
 * cannot parse comes out black on black. These are the same palette,
 * converted — if a token changes there, it has to change here too, which is
 * the price of the image being generated outside the browser.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const COLOR = {
  background: "#0e171d",
  surface: "#16232b",
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
  accent?: OgAccent;
}) {
  const accentColor = COLOR[accent];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: COLOR.background,
        color: COLOR.text,
        fontFamily: "sans-serif",
      }}
    >
      {/* The status colour as a full-height edge: legible as a thumbnail in
          a chat list, where the text is far too small to read. */}
      <div style={{ display: "flex", width: 20, backgroundColor: accentColor }} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "64px 72px",
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
                  padding: "8px 20px",
                  borderRadius: 999,
                  backgroundColor: COLOR.surface,
                  border: `2px solid ${accentColor}`,
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
              marginTop: 28,
              fontSize: title.length > 60 ? 60 : 76,
              fontWeight: 800,
              lineHeight: 1.1,
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
                marginTop: 26,
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
            paddingTop: 28,
            borderTop: `2px solid ${COLOR.border}`,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
            {OG_LABEL.siteName}
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 18,
              fontSize: 26,
              color: COLOR.muted,
            }}
          >
            {OG_LABEL.tagline}
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
