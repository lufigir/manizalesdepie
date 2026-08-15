import { ImageResponse } from "next/og";

import { AnimalDAL } from "@/data/animal/animal.dal";
import { ANIMAL_LABEL, OG_LABEL, freshness } from "@/lib/labels";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgCard,
  ogFonts,
  ogLogo,
  ogTitle,
} from "../../../_components/og-card";
import { OgPawPrintIcon } from "../../../_components/og-icons";

/**
 * The card for a shared animal — and the one card on this map that is not
 * `OgCard`.
 *
 * Every other route unfurls into typography, because what decides whether
 * somebody taps is a status word: open, closed, still has room. Here it is a
 * face. Somebody scrolling a barrio group at speed recognises the dog from
 * the corner two blocks away long before they read "perro café mediano", and
 * a generated card would spend the whole preview saying that in words.
 *
 * So the photo goes edge to edge, with a gradient and the same two facts over
 * it — what happened, and where it was seen — which survives WhatsApp
 * cropping the caption. A report with no photo falls back to `OgCard`: there
 * is nothing to show, and a grey rectangle reads as a broken link.
 */
export const alt = OG_LABEL.siteName;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// A literal, not the shared constant: Next reads segment config by static
// analysis. See the caching note in `og-card.tsx` for the hour.
export const revalidate = 3600;

/** Same hexes as `og-card.tsx`, and for the same reason: Satori cannot parse
 *  the `oklch` tokens in globals.css and renders black on black instead. */
const COLOR = {
  text: "#f4f7f8",
  muted: "#c3ced4",
  shade: "rgba(6,12,16,0.78)",
} as const;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [animal, fonts, logo] = await Promise.all([
    AnimalDAL.public().findById(id),
    ogFonts(),
    ogLogo(),
  ]);

  if (!animal) {
    return new ImageResponse(
      <OgCard eyebrow={OG_LABEL.animal} title={OG_LABEL.notFound} logo={logo} />,
      { ...size, fonts },
    );
  }

  const { label: freshLabel } = freshness(animal.lastSeenAt);
  const state = animal.resolvedAt
    ? ANIMAL_LABEL.resolved
    : ANIMAL_LABEL[animal.kind];
  const name = animal.petName ?? ANIMAL_LABEL[animal.species];
  const where = [
    animal.zone,
    `${ANIMAL_LABEL.seenAt} ${freshLabel.replace(/^Confirmado /, "")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!animal.photoUrl) {
    return new ImageResponse(
      (
        <OgCard
          eyebrow={state}
          title={ogTitle(name)}
          meta={where}
          icon={OgPawPrintIcon}
          logo={logo}
          accent={animal.resolvedAt ? "resolved" : "claimed"}
        />
      ),
      { ...size, fonts },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0e171d",
          fontFamily: "Inter",
        }}
      >
        {/* `object-fit: cover`, so a portrait phone photo fills the 1200×630
            frame instead of sitting letterboxed inside it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={animal.photoUrl}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Satori has no `linear-gradient` shorthand support worth relying on
            for text legibility, so the shade is a solid band across the lower
            third — which is also the part of the frame a photo of an animal
            is least likely to be using. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            padding: "40px 56px",
            backgroundColor: COLOR.shade,
            color: COLOR.text,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 4,
              fontWeight: 700,
              color: COLOR.muted,
            }}
          >
            {state.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: -1.5,
              lineHeight: 1.1,
            }}
          >
            {ogTitle(name, 40)}
          </div>
          {where && (
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 30,
                color: COLOR.muted,
              }}
            >
              {where}
            </div>
          )}

          {/* The same footer every other card carries, so a photo card still
              reads as coming from this app and not from a stranger's camera
              roll. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 22,
              paddingTop: 18,
              borderTop: "2px solid rgba(244,247,248,0.22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt=""
                width={38}
                height={38}
                style={{ marginRight: 14, borderRadius: 9 }}
              />
              <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>
                {OG_LABEL.siteName}
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
              {OG_LABEL.cta}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
