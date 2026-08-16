/**
 * The six glyphs the OpenGraph cards draw, as plain SVG.
 *
 * They are copied from Lucide rather than imported from it, and the reason is
 * not preference. `lucide-react` ships its icons behind a `"use client"`
 * boundary, and Satori — which renders these cards — calls a component
 * function directly on the server instead of going through React's client
 * reference. Importing an icon here throws "Attempted to call the default
 * export … from the server, but it's on the client" and the route answers a
 * shared link with a dropped connection, which is the worst possible failure
 * for a preview.
 *
 * One glyph per FAMILY, not per category. The card already names the
 * category in its eyebrow, and six shapes copied by hand is a maintainable
 * number where twenty-five would be a second icon set drifting quietly out of
 * step with `lib/labels.ts`.
 *
 * Paths are verbatim from `lucide-react@1.31`. If one is ever updated there,
 * the card keeps the old shape until somebody copies it again — an acceptable
 * cost for a decorative watermark, and the reason this file exists is written
 * above so the next person does not "fix" it back to an import.
 */

export type OgIcon = (props: { size: number; color: string }) => React.ReactElement;

/**
 * The paths arrive as an ARRAY, never wrapped in a fragment. Satori resolves
 * an element's tag from its `type`, and a fragment's type is a Symbol — it
 * fails with "Cannot convert a Symbol value to a string" and the route drops
 * the connection rather than returning an image.
 */
function icon(children: React.ReactNode[]): OgIcon {
  function Icon({ size, color }: { size: number; color: string }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    );
  }

  return Icon;
}

/** A place you can walk into — acopio, albergue, punto de sangre. */
export const OgPackageIcon = icon([
    <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" key="0" />,
    <path d="M12 22V12" key="1" />,
    <polyline points="3.29 7 12 12 20.71 7" key="2" />,
    <path d="m7.5 4.27 9 5.15" key="3" />,
  ]);


/** A necesidad: a household asking for work to be done. */
export const OgHardHatIcon = icon([
    <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" key="0" />,
    <path d="M14 6a6 6 0 0 1 6 6v3" key="1" />,
    <path d="M4 15v-3a6 6 0 0 1 6-6" key="2" />,
    <rect x="2" y="15" width="20" height="4" rx="1" key="3" />,
  ]);

/** A servicio: what somebody already has and is willing to lend. */
export const OgTruckIcon = icon([
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" key="0" />,
    <path d="M15 18H9" key="1" />,
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" key="2" />,
    <circle cx="17" cy="18" r="2" key="3" />,
    <circle cx="7" cy="18" r="2" key="4" />,
  ]);

/** An animal, lost or found. */
export const OgPawPrintIcon = icon([
    <circle cx="11" cy="4" r="2" key="0" />,
    <circle cx="18" cy="8" r="2" key="1" />,
    <circle cx="20" cy="16" r="2" key="2" />,
    <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" key="3" />,
  ]);

/** The map itself — the card for the bare domain. */
export const OgMapIcon = icon([
    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" key="0" />,
    <path d="M15 5.764v15" key="1" />,
    <path d="M9 3.236v15" key="2" />,
  ]);
