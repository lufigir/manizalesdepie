"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reportAnimal } from "@/data/animal/animal.actions";
import {
  ANIMAL_KINDS,
  ANIMAL_SPECIES,
  type AnimalKind,
  type AnimalSpecies,
} from "@/data/animal/animal.dto";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { compressImage, toDataUrl } from "@/lib/image";
import { ANIMAL_FORM, ANIMAL_LABEL } from "@/lib/labels";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import { useDemo } from "../../../_components/demo-store";

import { BarrioPicker } from "../../_components/barrio-picker";
import { Field } from "../../_components/field";
import { PinPicker } from "../../_components/pin-picker";
import {
  REPORT_FIELDS_PANE,
  REPORT_SPLIT,
  ReportMapPane,
} from "../../_components/report-layout";

const START: [number, number] = [-75.5074, 5.0631];

export function AnimalForm({
  barrios,
  header,
}: {
  barrios: NeighborhoodDTO[];
  /** The title block, from `ReportLayout`. Placed over the fields column so
   *  the map gets the full height of its own; on a phone it is just the top
   *  of the page, exactly where it always sat. */
  header: React.ReactNode;
}) {
  const router = useRouter();
  const demo = useDemo();
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  // From `lg` the zone (barrio + optional pin) moves into its own column
  // instead of sitting inline between the fields — see the render below.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const [kind, setKind] = useState<AnimalKind>("lost");
  const [species, setSpecies] = useState<AnimalSpecies>("dog");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // No neighborhood_id on animal_report — see the migration's own note that
  // the map is secondary here. This just gives the "zone" text field the
  // same barrio picker every other form uses instead of a blank input, and
  // still writes plain text into the same nullable column.
  const [barrio, setBarrio] = useState<NeighborhoodDTO | null>(null);
  // Whether the reporter has actually placed the pin. It starts false and the
  // map is open anyway: "lo vi por el centro" is a real answer, and a pin
  // that never left where the camera was aimed is not a fact about the
  // sighting — so no coordinate is recorded until the map is dragged by hand.
  const [placed, setPlaced] = useState(false);
  const [point, setPoint] = useState({ lng: START[0], lat: START[1] });
  const [error, setError] = useState<string | null>(null);

  const handleMove = useCallback(
    (lngLat: { lng: number; lat: number }) => setPoint(lngLat),
    [],
  );
  const handleUserMove = useCallback(() => setPlaced(true), []);

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 700px rather than the default 1400: this photo is about to be base64'd
    // into a server action's payload instead of uploaded to a bucket, and
    // base64 costs a third more than the bytes it encodes.
    const small = await compressImage(file, 700);
    setPhoto(small);
    // A local preview, so the reporter sees what they are about to publish
    // before anything is uploaded.
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(small);
    });
  }

  async function submit(formData: FormData) {
    setError(null);

    /** A text field's value. `FormData.get` can also hand back a `File`,
     *  which none of these are — this says so once instead of at four call
     *  sites. */
    const text = (field: string) => {
      const value = formData.get(field);
      return typeof value === "string" ? value : "";
    };

    const lastSeenAtLocal = formData.get("lastSeenAtLocal");
    const lastSeenAt = new Date(
      (typeof lastSeenAtLocal === "string" && lastSeenAtLocal) || Date.now(),
    ).toISOString();

    try {
      const animal = await reportAnimal({
        kind,
        species,
        petName: text("petName") || undefined,
        description: text("description"),
        // The photo goes inline, as a data URL, and never reaches storage —
        // there is none. See `toDataUrl`.
        photoUrl: photo ? await toDataUrl(photo) : undefined,
        lastSeenAt,
        longitude: placed ? point.lng : undefined,
        latitude: placed ? point.lat : undefined,
        zone: barrio?.name,
        whatsapp: text("whatsapp"),
      });
      demo.add("animals", animal);
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ANIMAL_FORM.failed);
    }
  }

  const kindField = (
    <Choice
      legend={ANIMAL_FORM.kind}
      options={ANIMAL_KINDS.map((k) => ({ value: k, label: ANIMAL_LABEL[k] }))}
      value={kind}
      onChange={setKind}
    />
  );

  const speciesField = (
    <Choice
      legend={ANIMAL_FORM.species}
      options={ANIMAL_SPECIES.map((s) => ({
        value: s,
        label: ANIMAL_LABEL[s],
      }))}
      value={species}
      onChange={setSpecies}
    />
  );

  const photoField = (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{ANIMAL_FORM.photo}</span>
      {/* No `capture`: that attribute skips straight to the camera on a
          phone, with no way back to the gallery. Most photos of a lost or
          found animal already exist — taken minutes ago, sent in a
          WhatsApp group — so forcing a new one through the camera would
          throw away the one that already answers the question. */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={pickPhoto}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="hover:bg-accent flex aspect-[5/2] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed"
      >
        {preview ? (
          // Deliberately a plain img: this is a blob: URL that only exists in
          // this tab, and next/image has nothing to optimise about it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-muted-foreground flex flex-col items-center gap-1.5 text-sm">
            <Camera className="size-6" aria-hidden />
            {ANIMAL_FORM.photoPick}
          </span>
        )}
      </button>
    </div>
  );

  const petNameField = (
    <Field label={ANIMAL_FORM.petName}>
      <Input name="petName" placeholder={ANIMAL_FORM.petNamePlaceholder} />
    </Field>
  );

  const descriptionField = (
    <Field label={ANIMAL_FORM.description} required>
      <Textarea
        name="description"
        rows={3}
        required
        placeholder={ANIMAL_FORM.descriptionPlaceholder}
      />
    </Field>
  );

  const whenField = (
    <Field label={ANIMAL_FORM.when} required>
      <Input name="lastSeenAtLocal" type="datetime-local" required />
    </Field>
  );

  // Barrio and the pin it frames: one pair, so they travel together into the
  // map pane on a desktop. The map is always shown — it is the one picture of
  // where the sighting happened — but a coordinate is only recorded once the
  // reporter moves it by hand (`placed`), so somebody who never touched it
  // publishes no location rather than a wrong one.
  const barrioField = (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold">{ANIMAL_FORM.zone}</label>
      <BarrioPicker barrios={barrios} value={barrio} onChange={setBarrio} />
    </div>
  );

  // Aimed at the chosen barrio, same as the site and grupo pickers — one less
  // thing to drag across the whole city to find.
  const mapField = (
    <PinPicker
      center={[barrio?.longitude ?? START[0], barrio?.latitude ?? START[1]]}
      focusLongitude={barrio?.longitude ?? null}
      focusLatitude={barrio?.latitude ?? null}
      onMove={handleMove}
      onUserMove={handleUserMove}
      className="lg:h-full"
    />
  );

  const whatsappField = (
    <Field label={ANIMAL_FORM.whatsapp} required>
      <Input name="whatsapp" inputMode="numeric" required placeholder="3001234567" />
    </Field>
  );

  const footer = (
    <>
      {error && (
        <p role="alert" className="text-pending text-sm font-medium">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending}>
        {pending ? ANIMAL_FORM.submitting : ANIMAL_FORM.submit}
      </Button>
    </>
  );

  const formAction = (formData: FormData) => startTransition(() => submit(formData));

  // From `lg` the zone gets its own column instead of sitting inline between
  // the fields — see `ReportLayout` for why the page can afford it. Below
  // `lg` this is exactly the single flowing column it always was.
  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <form action={formAction} className="flex flex-col gap-5">
          {kindField}
          {speciesField}
          {photoField}
          {petNameField}
          {descriptionField}
          {whenField}
          {barrioField}
          {mapField}
          <p className="text-muted-foreground text-xs">
            {ANIMAL_FORM.whereHint}
          </p>
          {whatsappField}
          {footer}
        </form>
      </div>
    );
  }

  return (
    <div className={REPORT_SPLIT}>
      <div className="flex min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 pb-5">{header}</div>
        <form action={formAction} className={REPORT_FIELDS_PANE}>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
            {kindField}
            {speciesField}
            {photoField}
            {petNameField}
            {descriptionField}
            {/* Two short fields that fit a column each — "¿Cuándo?" and the
                WhatsApp are not sentences, so side by side they cost one row
                instead of two. This render is desktop-only (`isDesktop` gates
                the whole branch), so no responsive prefix is needed. */}
            <div className="grid grid-cols-2 gap-5">
              {whenField}
              {whatsappField}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 pt-4">{footer}</div>
        </form>
      </div>

      <ReportMapPane control={barrioField}>{mapField}</ReportMapPane>
    </div>
  );
}

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              "focus-visible:ring-ring rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              value === option.value
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-accent",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
