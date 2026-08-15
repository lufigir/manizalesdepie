"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCall, findNearbyCalls } from "@/data/call/call.actions";
import { CALL_CATEGORIES, type CallCategory } from "@/data/call/call.dto";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import {
  CALL_CATEGORY_ICON,
  CALL_CATEGORY_LABEL,
  CALL_FORM,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useDraft } from "@/app/_hooks/use-draft";

import { BarrioPicker } from "../../_components/barrio-picker";
import { PinPicker } from "../../_components/pin-picker";

/** Central Manizales. Only where the picker opens before a barrio is chosen. */
const START: [number, number] = [-75.5074, 5.0631];

type Nearby = { id: string; title: string; startsAt: string; distanceM: number };

/**
 * "Alguien se está juntando aquí." One screen, five fields, no account.
 *
 * This used to be two forms behind a toggle: a scheduled grupo with a title,
 * an hour, a cap and a sign-in wall, and a bare pin for a sighting. Ten of
 * the first thirteen took the second path, one person in total ever signed
 * up, and the wall existed only to protect the roster that nobody built. So
 * the toggle is gone along with the half nobody chose, and what is left is
 * the promise that people actually made: this is a wiki entry, not a
 * commitment.
 */
export function CallForm({ barrios }: { barrios: NeighborhoodDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // The barrio tapped on the main map, and the category a Frentes row already
  // named, both carried in the URL. See the note in report-form.tsx: the map
  // lives in another route, so state cannot travel any other way.
  const searchParams = useSearchParams();
  const fromMap = searchParams.get("barrio");
  const [barrio, setBarrio] = useState<NeighborhoodDTO | null>(
    () => barrios.find((option) => option.name === fromMap) ?? null,
  );

  const fromCategory = searchParams.get("category");
  const initialCategory: CallCategory = (
    CALL_CATEGORIES as readonly string[]
  ).includes(fromCategory ?? "")
    ? (fromCategory as CallCategory)
    : "debris_removal";

  /**
   * The whole form is a draft, including the pin.
   *
   * There is no sign-in wall to survive any more, but the round trip through
   * a barrio picker and a dragged map is still long enough on a phone that a
   * backgrounded tab can lose it — and a coordinate silently reset to the
   * city centre is worse than losing the text, because nobody re-reads a map
   * they already placed.
   */
  const { value: draft, setValue: setDraft, clear } = useDraft("report:call", {
    category: initialCategory,
    description: "",
    meetingAddress: "",
    whatsapp: "",
    lng: START[0],
    lat: START[1],
  });

  /**
   * The map is mounted one render late, on purpose.
   *
   * `PinPicker` reads `center` only when it mounts, and the saved draft only
   * arrives after the restoring effect has run. This effect is registered after
   * that one — hooks run in declaration order — so both state updates batch into
   * a single render in which the draft is already the restored one.
   */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Setting state from an effect, deliberately: sessionStorage does not exist
    // while rendering on the server, so the restored draft cannot be known any
    // earlier without a hydration mismatch. Same exception as in useDraft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  const [nearby, setNearby] = useState<Nearby[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const field = useCallback(
    (key: keyof typeof draft) => (value: string) =>
      setDraft((current) => ({ ...current, [key]: value })),
    [setDraft],
  );

  // Stable identity so PinPicker's effect does not re-subscribe every render.
  // Fires on `moveend`, so this writes once per gesture rather than per frame.
  const handleMove = useCallback(
    (lngLat: { lng: number; lat: number }) =>
      setDraft((current) => ({ ...current, lng: lngLat.lng, lat: lngLat.lat })),
    [setDraft],
  );

  async function submit(skipDuplicateCheck = false) {
    setError(null);

    // See report-form.tsx: without a barrio the map was never re-framed and the
    // pin is still on the city centre, which would put this grupo in somebody
    // else's neighbourhood.
    if (!barrio) {
      setError(CALL_FORM.barrioRequired);
      return;
    }

    if (!skipDuplicateCheck) {
      // "Now", because that is what the row will be stamped with — the same
      // instant the duplicate check has to search around.
      const found = await findNearbyCalls(
        draft.lng,
        draft.lat,
        new Date().toISOString(),
      );
      if (found.length > 0) {
        setNearby(found);
        return;
      }
    }

    try {
      const { id } = await createCall({
        category: draft.category,
        description: draft.description || undefined,
        meetingAddress: draft.meetingAddress || undefined,
        whatsapp: draft.whatsapp || undefined,
        longitude: draft.lng,
        latitude: draft.lat,
      });
      clear();
      router.push(`/grupo/${id}`);
    } catch (cause) {
      // The DAL surfaces the schema's own messages, which carry the useful
      // one: out of area.
      setError(cause instanceof Error ? cause.message : CALL_FORM.failed);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => submit());
      }}
      className="flex flex-col gap-5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">
          {CALL_FORM.category}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {CALL_CATEGORIES.map((option) => {
            const Icon = CALL_CATEGORY_ICON[option];
            const active = option === draft.category;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setDraft((c) => ({ ...c, category: option }))}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {CALL_CATEGORY_LABEL[option]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold">{CALL_FORM.barrio}</label>
        <BarrioPicker barrios={barrios} value={barrio} onChange={setBarrio} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold">{CALL_FORM.where}</label>
        {ready ? (
          <PinPicker
            center={[draft.lng, draft.lat]}
            focusLongitude={barrio?.longitude ?? null}
            focusLatitude={barrio?.latitude ?? null}
            onMove={handleMove}
          />
        ) : (
          <div className="bg-muted h-56 rounded-xl border" />
        )}
        <p className="text-muted-foreground text-xs">
          {barrio ? CALL_FORM.whereHint : CALL_FORM.whereLocked}
        </p>
      </div>

      {/* Optional: the barrio and the dragged pin already say where, and
          somebody walking past a cuadrilla often cannot name the corner. */}
      <Field
        label={CALL_FORM.meetingAddress}
        hint={CALL_FORM.meetingAddressHint}
      >
        <Input
          value={draft.meetingAddress}
          onChange={(event) => field("meetingAddress")(event.target.value)}
          placeholder={CALL_FORM.meetingAddressPlaceholder}
        />
      </Field>

      <Field label={CALL_FORM.description}>
        <Textarea
          rows={3}
          value={draft.description}
          onChange={(event) => field("description")(event.target.value)}
          placeholder={CALL_FORM.descriptionPlaceholder}
        />
      </Field>

      <Field label={CALL_FORM.whatsapp} hint={CALL_FORM.whatsappHint}>
        <Input
          inputMode="numeric"
          value={draft.whatsapp}
          onChange={(event) => field("whatsapp")(event.target.value)}
          placeholder="3001234567"
        />
      </Field>

      {nearby && (
        <div className="border-claimed/30 bg-claimed-surface flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-claimed text-sm font-semibold">
            {CALL_FORM.nearbyTitle}
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {nearby.map((call) => (
              <li key={call.id}>
                <a
                  href={`/grupo/${call.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  {call.title}
                </a>
                <span className="text-muted-foreground tabular-nums">
                  {" · "}a {call.distanceM} m
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">{CALL_FORM.nearbyBody}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={pending}
            onClick={() => startTransition(() => submit(true))}
          >
            {CALL_FORM.nearbyIgnore}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-unclaimed text-sm font-medium">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Button type="submit" loading={pending}>
          {pending ? CALL_FORM.submitting : CALL_FORM.submit}
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          {CALL_FORM.hint}
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
    </label>
  );
}
