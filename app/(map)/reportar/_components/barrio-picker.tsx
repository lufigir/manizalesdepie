"use client";

import { useMemo, useState } from "react";
import { Check, LocateFixed, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { BARRIO_PICKER } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Which barrio, before which exact spot.
 *
 * This replaced opening a map of the whole city and asking someone to find
 * their own street on it. That is the hard version of the question: the
 * reporter is standing on the ground, one bar of signal, and the map starts
 * four kilometres away at a scale where nothing is recognisable. Naming the
 * barrio is the easy version — nobody in Manizales has to think about it — and
 * it is enough to frame the map so that what is left is adjusting metres.
 *
 * The barrio is NOT what gets stored. The pin still decides that, through the
 * trigger in Postgres, which is what keeps the panel from ever saying "Chipre"
 * while the marker sits in the barrio next door. This is a way of aiming the
 * camera, and the copy says so.
 *
 * A list rendered inline rather than a floating combobox: a popover on a phone
 * covers the field that filters it, and this list has 118 entries.
 */
export function BarrioPicker({
  barrios,
  value,
  onChange,
}: {
  barrios: NeighborhoodDTO[];
  value: NeighborhoodDTO | null;
  /** Null clears the choice and brings the search back. */
  onChange: (barrio: NeighborhoodDTO | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const needle = fold(query);
    if (!needle) return barrios;
    return barrios.filter((barrio) => fold(barrio.name).includes(needle));
  }, [barrios, query]);

  /**
   * The barrio the phone is standing in, by nearest centroid.
   *
   * Nearest centroid rather than point-in-polygon, and that is a deliberate
   * trade: the polygons are 149 KB and this is a preselection the person can
   * change in one tap. Near a border it can name the barrio across the street —
   * which costs nothing, because the stored barrio comes from the pin either
   * way.
   */
  function locate() {
    setLocateError(null);

    if (!navigator.geolocation) {
      setLocateError(BARRIO_PICKER.locateFailed);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const nearest = nearestTo(barrios, coords.longitude, coords.latitude);
        if (nearest) {
          onChange(nearest);
          setQuery("");
        } else {
          setLocateError(BARRIO_PICKER.locateFailed);
        }
      },
      () => {
        setLocating(false);
        // Denied, timed out, or no fix. Not an error worth dramatising: the
        // search box below has been there the whole time.
        setLocateError(BARRIO_PICKER.locateDenied);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-2.5">
        <Check className="text-resolved size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight font-semibold">{value.name}</p>
          <p className="text-muted-foreground text-xs">
            {BARRIO_PICKER.municipality[value.municipality]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="hover:bg-accent focus-visible:ring-ring shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          {BARRIO_PICKER.change}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="hover:bg-accent focus-visible:ring-ring flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
      >
        <LocateFixed className="size-4" aria-hidden />
        {locating ? BARRIO_PICKER.locating : BARRIO_PICKER.locate}
      </button>

      {locateError && (
        <p className="text-muted-foreground text-xs">{locateError}</p>
      )}

      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={BARRIO_PICKER.search}
          aria-label={BARRIO_PICKER.search}
          className="pl-8"
        />
      </div>

      <ul className="max-h-56 overflow-y-auto rounded-lg border">
        {matches.length === 0 ? (
          <li className="text-muted-foreground p-3 text-sm text-balance">
            {BARRIO_PICKER.empty}
          </li>
        ) : (
          matches.map((barrio) => (
            <li key={barrio.id}>
              <button
                type="button"
                onClick={() => onChange(barrio)}
                className={cn(
                  "hover:bg-accent focus-visible:ring-ring w-full px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2",
                )}
              >
                {barrio.name}
                {barrio.municipality === "villamaria" && (
                  <span className="text-muted-foreground text-xs">
                    {" "}
                    · {BARRIO_PICKER.municipality.villamaria}
                  </span>
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

/** Accent- and case-insensitive, because "Fátima" is typed "fatima" by anyone
 *  in a hurry and the official names carry their tildes. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Nearest centroid. Equirectangular rather than haversine: over a city eight
 *  kilometres across the difference is centimetres, and this only has to rank. */
function nearestTo(
  barrios: NeighborhoodDTO[],
  longitude: number,
  latitude: number,
): NeighborhoodDTO | null {
  let best: NeighborhoodDTO | null = null;
  let bestDistance = Infinity;
  const scale = Math.cos((latitude * Math.PI) / 180);

  for (const barrio of barrios) {
    const dx = (barrio.longitude - longitude) * scale;
    const dy = barrio.latitude - latitude;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = barrio;
    }
  }

  return best;
}
