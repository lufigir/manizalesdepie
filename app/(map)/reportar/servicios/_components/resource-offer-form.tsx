"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { proposeResourceOffer } from "@/data/resource_offer/resource_offer.actions";
import {
  RESOURCE_TYPES,
  type ResourceType,
} from "@/data/resource_offer/resource_offer.dto";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { RESOURCE_TYPE_ICON, RESOURCE_TYPE_LABEL, SERVICES_FORM } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { BarrioPicker } from "../../_components/barrio-picker";

/**
 * "Tengo con qué ayudar." Anonymous, one screen, no pin to drag.
 *
 * No PinPicker, unlike the site and grupo forms: a truck someone can drive
 * anywhere in the city has no one corner to mark, so the barrio it starts
 * from — the same picker those forms use — is both the question and the
 * answer here. Its centroid becomes the offer's point, close enough to sort
 * it into the right barrio and no more precise a claim than the offer
 * itself makes.
 */
export function ResourceOfferForm({ barrios }: { barrios: NeighborhoodDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<ResourceType>("dump_truck");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [barrio, setBarrio] = useState<NeighborhoodDTO | null>(null);
  const [wholeCity, setWholeCity] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [availableFromLocal, setAvailableFromLocal] = useState("");
  const [availableUntilLocal, setAvailableUntilLocal] = useState("");

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
      await proposeResourceOffer({
        type,
        description,
        quantity: quantity ? Number(quantity) : undefined,
        area,
        longitude: barrio?.longitude ?? undefined,
        latitude: barrio?.latitude ?? undefined,
        whatsapp,
        availableFrom: availableFromLocal
          ? new Date(availableFromLocal).toISOString()
          : undefined,
        availableUntil: availableUntilLocal
          ? new Date(availableUntilLocal).toISOString()
          : undefined,
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
          {RESOURCE_TYPES.map((option) => {
            const Icon = RESOURCE_TYPE_ICON[option];
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
                {RESOURCE_TYPE_LABEL[option]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label={SERVICES_FORM.description}>
        <Textarea
          required
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={SERVICES_FORM.descriptionPlaceholder}
        />
      </Field>

      <Field label={SERVICES_FORM.quantity} hint={SERVICES_FORM.quantityHint}>
        <Input
          type="number"
          min={1}
          max={9999}
          inputMode="numeric"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
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

      <Field label={SERVICES_FORM.whatsapp} hint={SERVICES_FORM.whatsappHint}>
        <Input
          required
          inputMode="numeric"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          placeholder="3001234567"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={SERVICES_FORM.availableFrom} hint={SERVICES_FORM.availableHint}>
          <Input
            type="datetime-local"
            value={availableFromLocal}
            onChange={(event) => setAvailableFromLocal(event.target.value)}
          />
        </Field>
        <Field label={SERVICES_FORM.availableUntil}>
          <Input
            type="datetime-local"
            value={availableUntilLocal}
            onChange={(event) => setAvailableUntilLocal(event.target.value)}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="text-unclaimed text-sm font-medium">
          {error}
        </p>
      )}

      <Button type="submit" loading={pending}>
        {pending ? SERVICES_FORM.submitting : SERVICES_FORM.submit}
      </Button>
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
