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
import { compressImage } from "@/lib/image";
import { ANIMAL_FORM, ANIMAL_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { PinPicker } from "../../_components/pin-picker";

const START: [number, number] = [-75.5074, 5.0631];

export function AnimalForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<AnimalKind>("lost");
  const [species, setSpecies] = useState<AnimalSpecies>("dog");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [usePin, setUsePin] = useState(false);
  const [point, setPoint] = useState({ lng: START[0], lat: START[1] });
  const [error, setError] = useState<string | null>(null);

  const handleMove = useCallback(
    (lngLat: { lng: number; lat: number }) => setPoint(lngLat),
    [],
  );

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const small = await compressImage(file);
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

    formData.set("kind", kind);
    formData.set("species", species);
    formData.set("lastSeenAt", new Date(
      String(formData.get("lastSeenAtLocal") || "") || Date.now(),
    ).toISOString());
    if (photo) formData.set("photo", photo);
    if (usePin) {
      formData.set("longitude", String(point.lng));
      formData.set("latitude", String(point.lat));
    }

    try {
      await reportAnimal(formData);
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ANIMAL_FORM.failed);
    }
  }

  return (
    <form
      action={(formData) => startTransition(() => submit(formData))}
      className="flex flex-col gap-5"
    >
      <Choice
        legend={ANIMAL_FORM.kind}
        options={ANIMAL_KINDS.map((k) => ({ value: k, label: ANIMAL_LABEL[k] }))}
        value={kind}
        onChange={setKind}
      />

      <Choice
        legend={ANIMAL_FORM.species}
        options={ANIMAL_SPECIES.map((s) => ({
          value: s,
          label: ANIMAL_LABEL[s],
        }))}
        value={species}
        onChange={setSpecies}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{ANIMAL_FORM.photo}</span>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={pickPhoto}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="hover:bg-accent flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-dashed"
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
        <p className="text-muted-foreground text-xs">{ANIMAL_FORM.photoHint}</p>
      </div>

      <Field label={ANIMAL_FORM.petName}>
        <Input name="petName" placeholder={ANIMAL_FORM.petNamePlaceholder} />
      </Field>

      <Field label={ANIMAL_FORM.description}>
        <Textarea
          name="description"
          rows={3}
          required
          placeholder={ANIMAL_FORM.descriptionPlaceholder}
        />
      </Field>

      <Field label={ANIMAL_FORM.when}>
        <Input name="lastSeenAtLocal" type="datetime-local" required />
      </Field>

      <Field label={ANIMAL_FORM.zone}>
        <Input name="zone" placeholder={ANIMAL_FORM.zonePlaceholder} />
      </Field>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={usePin}
            onChange={(event) => setUsePin(event.target.checked)}
          />
          {ANIMAL_FORM.where}
        </label>
        {usePin && (
          <>
            <PinPicker center={START} onMove={handleMove} />
            <p className="text-muted-foreground text-xs">
              {ANIMAL_FORM.whereHint}
            </p>
          </>
        )}
      </div>

      <Field label={ANIMAL_FORM.whatsapp} hint={ANIMAL_FORM.whatsappHint}>
        <Input name="whatsapp" inputMode="numeric" required placeholder="3001234567" />
      </Field>

      {error && (
        <p role="alert" className="text-unclaimed text-sm font-medium">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending}>
        {pending ? ANIMAL_FORM.submitting : ANIMAL_FORM.submit}
      </Button>
    </form>
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
