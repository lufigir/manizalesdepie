"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  conveneCall,
  findNearbyCalls,
  gatherInformalCall,
} from "@/data/call/call.actions";
import { CALL_CATEGORIES, type CallCategory } from "@/data/call/call.dto";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import {
  CALL_CATEGORY_ICON,
  CALL_CATEGORY_LABEL,
  CALL_FORM,
  callWhen,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useDraft } from "@/app/_hooks/use-draft";

import { BarrioPicker } from "../../_components/barrio-picker";
import { PinPicker } from "../../_components/pin-picker";
import { PublishGate } from "@/app/_components/publish-gate";

/** Central Manizales. Only where the picker opens before a barrio is chosen. */
const START: [number, number] = [-75.5074, 5.0631];

type Nearby = { id: string; title: string; startsAt: string; distanceM: number };

export function CallForm({
  signedIn,
  barrios,
}: {
  signedIn: boolean;
  barrios: NeighborhoodDTO[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Two different promises, not one form with optional fields hidden behind
  // a checkbox: the formal path ends at PublishGate because an organiser is
  // collecting phone numbers, and the informal one skips it entirely because
  // it collects nothing. Mixing them into a single mode a checkbox toggles
  // would make it too easy to end up half in one, half in the other — a
  // "convocatoria" with no responsable and a hard sign-in wall for a comment
  // that just says "gente juntándose aquí".
  const [mode, setMode] = useState<"formal" | "informal">("formal");

  // The barrio tapped on the main map, carried in the URL. See the note in
  // report-form.tsx: the map lives in another route, so state cannot travel.
  const fromMap = useSearchParams().get("barrio");
  const [barrio, setBarrio] = useState<NeighborhoodDTO | null>(
    () => barrios.find((option) => option.name === fromMap) ?? null,
  );

  /**
   * The whole form is a draft, including the pin.
   *
   * This is the only form in the app that ends at a sign-in wall, so it is the
   * only one where the round trip to Google can happen mid-sentence. Deferred
   * sign-up is only kinder than asking at the door if the work survives the
   * trip — and a coordinate silently reset to the city centre would be worse
   * than losing the text, because nobody re-reads a map they already placed.
   */
  const { value: draft, setValue: setDraft, clear } = useDraft("report:call", {
    category: "debris_removal" as CallCategory,
    title: "",
    description: "",
    meetingAddress: "",
    startsLocal: "",
    endsLocal: "",
    slotsTotal: "",
    bring: "",
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
   * a single render in which the draft is already the restored one. Mounting
   * immediately would frame the city centre and quietly discard the coordinate
   * the organiser had chosen before signing in.
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

  async function submitInformal() {
    setError(null);

    if (!barrio) {
      setError(CALL_FORM.barrioRequired);
      return;
    }

    try {
      const { id } = await gatherInformalCall({
        category: draft.category,
        description: draft.description || undefined,
        meetingAddress: draft.meetingAddress || undefined,
        longitude: draft.lng,
        latitude: draft.lat,
      });
      clear();
      router.push(`/jornada/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : CALL_FORM.failed);
    }
  }

  async function submit(skipDuplicateCheck = false) {
    setError(null);

    // See report-form.tsx: without a barrio the map was never re-framed and the
    // pin is still on the city centre. Ten people would be sent to the wrong
    // corner at a fixed hour, which is the one failure this form cannot afford.
    if (!barrio) {
      setError(CALL_FORM.barrioRequired);
      return;
    }

    // The browser gives a local wall-clock string; the database wants an
    // instant. Converted here, through the device's own timezone, which is the
    // one the organiser was reading when they typed "8:00".
    const startsAt = new Date(draft.startsLocal).toISOString();

    if (!skipDuplicateCheck) {
      const found = await findNearbyCalls(draft.lng, draft.lat, startsAt);
      if (found.length > 0) {
        setNearby(found);
        return;
      }
    }

    const formData = new FormData();
    formData.set("category", draft.category);
    formData.set("title", draft.title);
    formData.set("description", draft.description);
    formData.set("meetingAddress", draft.meetingAddress);
    formData.set("startsAt", startsAt);
    if (draft.endsLocal) {
      formData.set("endsAt", new Date(draft.endsLocal).toISOString());
    }
    if (draft.slotsTotal) formData.set("slotsTotal", draft.slotsTotal);
    formData.set("bring", draft.bring);
    formData.set("whatsapp", draft.whatsapp);
    formData.set("longitude", String(draft.lng));
    formData.set("latitude", String(draft.lat));

    try {
      const { id } = await conveneCall(formData);
      clear();
      router.push(`/jornada/${id}`);
    } catch (cause) {
      // The DAL surfaces the schema's own messages, which carry the useful
      // ones: out of area, and the end hour before the start.
      setError(cause instanceof Error ? cause.message : CALL_FORM.failed);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => (mode === "informal" ? submitInformal() : submit()));
      }}
      className="flex flex-col gap-5"
    >
      <div
        role="radiogroup"
        className="bg-muted flex gap-1 rounded-lg p-1"
      >
        {(
          [
            ["formal", CALL_FORM.modeFormal, CALL_FORM.modeFormalHint],
            ["informal", CALL_FORM.modeInformal, CALL_FORM.modeInformalHint],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "focus-visible:ring-ring flex-1 rounded-md px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
              mode === value
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block text-xs">{hint}</span>
          </button>
        ))}
      </div>

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

      {mode === "formal" && (
        <>
          <Field label={CALL_FORM.callTitle}>
            <Input
              required
              value={draft.title}
              onChange={(event) => field("title")(event.target.value)}
              placeholder={CALL_FORM.callTitlePlaceholder}
            />
          </Field>

          {/* When comes before where. A shift with the wrong hour wastes a
              morning; a shift with a vague corner still gets found by
              asking. */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={CALL_FORM.starts}>
              <Input
                type="datetime-local"
                required
                value={draft.startsLocal}
                onChange={(event) => field("startsLocal")(event.target.value)}
              />
            </Field>
            <Field label={CALL_FORM.ends} hint={CALL_FORM.endsHint}>
              <Input
                type="datetime-local"
                value={draft.endsLocal}
                onChange={(event) => field("endsLocal")(event.target.value)}
              />
            </Field>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold">{CALL_FORM.barrio}</label>
        <BarrioPicker barrios={barrios} value={barrio} onChange={setBarrio} />
      </div>

      {/* Required for a formal jornada — ten people have to find the same
          corner — optional here: an informal pin already has the barrio and
          the dragged point, and asking for a third way of saying "where"
          fights the whole reason this mode exists. */}
      <Field
        label={CALL_FORM.meetingAddress}
        hint={mode === "formal" ? CALL_FORM.meetingAddressHint : undefined}
      >
        <Input
          required={mode === "formal"}
          value={draft.meetingAddress}
          onChange={(event) => field("meetingAddress")(event.target.value)}
          placeholder={CALL_FORM.meetingAddressPlaceholder}
        />
      </Field>

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

      <Field
        label={
          mode === "formal"
            ? CALL_FORM.description
            : CALL_FORM.informalDescription
        }
      >
        <Textarea
          rows={3}
          value={draft.description}
          onChange={(event) => field("description")(event.target.value)}
          placeholder={
            mode === "formal"
              ? CALL_FORM.descriptionPlaceholder
              : CALL_FORM.informalDescriptionPlaceholder
          }
        />
      </Field>

      {mode === "formal" && (
        <>
          <Field label={CALL_FORM.bring}>
            <Input
              value={draft.bring}
              onChange={(event) => field("bring")(event.target.value)}
              placeholder={CALL_FORM.bringPlaceholder}
            />
          </Field>

          <Field label={CALL_FORM.slots} hint={CALL_FORM.slotsHint}>
            <Input
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              value={draft.slotsTotal}
              onChange={(event) => field("slotsTotal")(event.target.value)}
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
                      href={`/jornada/${call.id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {call.title}
                    </a>
                    <span className="text-muted-foreground tabular-nums">
                      {" "}
                      ·{" "}
                      {callWhen({
                        startsAt: call.startsAt,
                        endsAt: null,
                        informal: false,
                      })}{" "}
                      · a {call.distanceM} m
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                {CALL_FORM.nearbyBody}
              </p>
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
        </>
      )}

      {error && (
        <p role="alert" className="text-unclaimed text-sm font-medium">
          {error}
        </p>
      )}

      {mode === "formal" ? (
        // The one gate in the app. Everything above is open to anyone; the
        // account is asked for here, at the end, because from this point on
        // other people start depending on whoever convened this.
        <PublishGate
          signedIn={signedIn}
          pending={pending}
          // Nothing to flush: useDraft persists on every change, so what is
          // in sessionStorage is already what is on screen — the pin
          // included.
          onBeforeRedirect={() => {}}
        >
          {pending ? CALL_FORM.submitting : CALL_FORM.submit}
        </PublishGate>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Button type="submit" loading={pending}>
            {pending ? CALL_FORM.submitting : CALL_FORM.informalSubmit}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            {CALL_FORM.informalHint}
          </p>
        </div>
      )}
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
