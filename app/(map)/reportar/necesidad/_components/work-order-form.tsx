"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { reportWorkOrder } from "@/data/work_order/work_order.actions";
import {
  WORK_ORDER_CATEGORIES,
  type WorkOrderCategory,
} from "@/data/work_order/work_order.dto";
import {
  WORK_ORDER_CATEGORY_ICON,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_FORM,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { BarrioPicker } from "../../_components/barrio-picker";
import { PinPicker } from "../../_components/pin-picker";

const START: [number, number] = [-75.5074, 5.0631];

/**
 * "Hay escombros aquí, alguien con volqueta que lo vea." Anonymous, like a
 * site report — the account is asked of whoever CLAIMS the case, not
 * whoever reports it, because reporting damage collects nobody's contact
 * details on the reporter's own behalf.
 */
export function WorkOrderForm({ barrios }: { barrios: NeighborhoodDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fromMap = useSearchParams().get("barrio");
  const [barrio, setBarrio] = useState<NeighborhoodDTO | null>(
    () => barrios.find((option) => option.name === fromMap) ?? null,
  );

  const [category, setCategory] = useState<WorkOrderCategory>("debris_removal");
  const [description, setDescription] = useState("");
  const [point, setPoint] = useState({ lng: START[0], lat: START[1] });
  const [exactAddress, setExactAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  const handleMove = useCallback(
    (lngLat: { lng: number; lat: number }) => setPoint(lngLat),
    [],
  );

  async function submit() {
    setError(null);

    if (!barrio) {
      setError(WORK_ORDER_FORM.barrio);
      return;
    }

    try {
      // The created id used to travel in the URL to select the new pin on
      // arrival at `/ayudar`; nothing reads a query-driven selection any
      // more (see `MapWorkspace`), so it is not carried forward to `/`.
      await reportWorkOrder({
        category,
        description,
        longitude: point.lng,
        latitude: point.lat,
        exactAddress: exactAddress || undefined,
        contactName: contactName || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
      });
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : WORK_ORDER_FORM.failed);
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
          {WORK_ORDER_FORM.category}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {WORK_ORDER_CATEGORIES.map((option) => {
            const Icon = WORK_ORDER_CATEGORY_ICON[option];
            const active = option === category;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {WORK_ORDER_CATEGORY_LABEL[option]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label={WORK_ORDER_FORM.description}>
        <Textarea
          required
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={WORK_ORDER_FORM.descriptionPlaceholder}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold">{WORK_ORDER_FORM.barrio}</label>
        <BarrioPicker barrios={barrios} value={barrio} onChange={setBarrio} />
      </div>

      <div className="flex flex-col gap-2">
        {ready ? (
          <PinPicker
            center={[point.lng, point.lat]}
            focusLongitude={barrio?.longitude ?? null}
            focusLatitude={barrio?.latitude ?? null}
            onMove={handleMove}
          />
        ) : (
          <div className="bg-muted h-56 rounded-xl border" />
        )}
      </div>

      {/* Published on the card, so the warning is part of the block rather
          than a note somewhere else on the page: whatever goes in here is
          visible to anyone, and half of these reports are written about
          somebody else's house. The copy is the only protection this data
          has left — nothing downstream can take a published address back. */}
      <div className="border-claimed/40 bg-claimed-surface/40 flex flex-col gap-3 rounded-lg border p-3">
        <div>
          <p className="text-sm font-semibold">{WORK_ORDER_FORM.contactTitle}</p>
          <p className="text-muted-foreground text-xs">{WORK_ORDER_FORM.contactHint}</p>
        </div>
        <Field label={WORK_ORDER_FORM.exactAddress}>
          <Input value={exactAddress} onChange={(e) => setExactAddress(e.target.value)} />
        </Field>
        <Field label={WORK_ORDER_FORM.contactName}>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </Field>
        <Field label={WORK_ORDER_FORM.phone}>
          <Input
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="3001234567"
          />
        </Field>
        <Field label={WORK_ORDER_FORM.notes}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      {error && (
        <p role="alert" className="text-unclaimed text-sm font-medium">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending}>
        {pending ? WORK_ORDER_FORM.submitting : WORK_ORDER_FORM.submit}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
