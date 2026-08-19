"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { proposeService } from "@/data/service/service.actions";
import {
  SERVICE_TYPES,
  type ServiceType,
} from "@/data/service/service.dto";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { SERVICE_TYPE_ICON, SERVICE_TYPE_LABEL, SERVICES_FORM } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { BarrioPicker } from "../../_components/barrio-picker";
import { Field } from "../../_components/field";

/**
 * "Tengo con qué ayudar." Anonymous, one screen, no pin to drag, four
 * fields.
 *
 * It used to have seven. "¿Cuántos?" and a pair of datetime pickers came back
 * empty 46 times out of 46, so the count now lives in the description where
 * somebody types it in words if it matters, and how long the offer stands is
 * `expiresAt`'s job rather than a question.
 *
 * No PinPicker, unlike the site and grupo forms: a truck someone can drive
 * anywhere in the city has no one corner to mark, so the barrio it starts
 * from — the same picker those forms use — is both the question and the
 * answer here. Its centroid becomes the offer's point, close enough to sort
 * it into the right barrio and no more precise a claim than the offer
 * itself makes.
 */
export function ServiceForm({ barrios }: { barrios: NeighborhoodDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<ServiceType>("dump_truck");
  const [description, setDescription] = useState("");
  const [barrio, setBarrio] = useState<NeighborhoodDTO | null>(null);
  const [wholeCity, setWholeCity] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");

  async function submit() {
    setError(null);

    // Optional, unlike the site and grupo forms: a fixed collection point
    // has to be somewhere, but "llevo gente a donde sea" or "presto mi
    // volqueta en cualquier barrio" is a real, common answer for exactly the
    // types this section exists for (free_transport most of all). No barrio
    // chosen means no claim about one — `area` says so in words, and
    // location/neighborhood stay null, which the schema already treats as
    // "we do not know a single point", not as an error.
    const area = barrio?.name ?? SERVICES_FORM.wholeCity;

    try {
      // Same as the work-order form: the created id used to travel in the
      // URL to select the new pin on arrival at `/servicios`; nothing reads
      // a query-driven selection any more, so it is not carried forward.
      await proposeService({
        type,
        description,
        area,
        longitude: barrio?.longitude ?? undefined,
        latitude: barrio?.latitude ?? undefined,
        whatsapp,
      });
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : SERVICES_FORM.failed);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(submit);
      }}
      className="flex flex-col gap-5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">
          {SERVICES_FORM.type}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_TYPES.map((option) => {
            const Icon = SERVICE_TYPE_ICON[option];
            const active = option === type;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {SERVICE_TYPE_LABEL[option]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label={SERVICES_FORM.description} required>
        <Textarea
          required
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={SERVICES_FORM.descriptionPlaceholder}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-semibold">
            {SERVICES_FORM.barrio}
          </label>
          <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            <input
              type="checkbox"
              checked={wholeCity}
              onChange={(event) => {
                setWholeCity(event.target.checked);
                if (event.target.checked) setBarrio(null);
              }}
            />
            {SERVICES_FORM.wholeCity}
          </label>
        </div>
        {/* Some offers — free_transport most of all — do not start from any
            one barrio, and "elige uno igual" would be asking the reporter
            to invent a fact. The checkbox is the honest way out: it is a
            different claim from "no elegí todavía", not a shortcut past a
            required field. */}
        {!wholeCity && (
          <BarrioPicker barrios={barrios} value={barrio} onChange={setBarrio} />
        )}
      </div>

      <Field
        label={SERVICES_FORM.whatsapp}
        hint={SERVICES_FORM.whatsappHint}
        required
      >
        <Input
          required
          inputMode="numeric"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          placeholder="3001234567"
        />
      </Field>

      {error && (
        <p role="alert" className="text-pending text-sm font-medium">
          {error}
        </p>
      )}

      <Button type="submit" loading={pending}>
        {pending ? SERVICES_FORM.submitting : SERVICES_FORM.submit}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        {SERVICES_FORM.hint}
      </p>
    </form>
  );
}
