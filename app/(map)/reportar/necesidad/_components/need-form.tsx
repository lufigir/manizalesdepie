"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { reportNeed } from "@/data/need/need.actions";
import {
  NEED_CATEGORIES,
  type NeedCategory,
} from "@/data/need/need.dto";
import {
  NEED_CATEGORY_ICON,
  NEED_CATEGORY_LABEL,
  NEED_FORM,
} from "@/lib/labels";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import { BarrioPicker } from "../../_components/barrio-picker";
import { Field, RequiredMark } from "../../_components/field";
import { PinPicker } from "../../_components/pin-picker";
import {
  REPORT_FIELDS_PANE,
  REPORT_SPLIT,
  ReportMapPane,
} from "../../_components/report-layout";

const START: [number, number] = [-75.5074, 5.0631];

/**
 * "Hay escombros aquí, alguien con volqueta que lo vea." Anonymous, like a
 * site report — the account is asked of whoever CLAIMS the case, not
 * whoever reports it, because reporting damage collects nobody's contact
 * details on the reporter's own behalf.
 */
export function NeedForm({
  barrios,
  userName,
  header,
}: {
  barrios: NeighborhoodDTO[];
  /** The signed-in reader's name, or null. Seeds the contact field only —
   *  reporting still requires no account. */
  userName: string | null;
  /** The title block, from `ReportLayout`. Placed over the fields column so
   *  the map gets the full height of its own; on a phone it is just the top
   *  of the page, exactly where it always sat. */
  header: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // True once "Publicar" was hit with no barrio. Gates the map's red frame
  // to that moment (and to the barrio still being missing) instead of wearing
  // it from the first render.
  const [attempted, setAttempted] = useState(false);
  // From `lg` the map moves into its own column instead of sitting inline
  // between the fields — see the render below.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const fromMap = useSearchParams().get("barrio");
  const [barrio, setBarrio] = useState<NeighborhoodDTO | null>(
    () => barrios.find((option) => option.name === fromMap) ?? null,
  );

  const [category, setCategory] = useState<NeedCategory>("debris_removal");
  const [description, setDescription] = useState("");
  const [point, setPoint] = useState({ lng: START[0], lat: START[1] });
  const [exactAddress, setExactAddress] = useState("");
  const [contactName, setContactName] = useState(userName ?? "");
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
      setAttempted(true);
      setError(NEED_FORM.barrio);
      return;
    }

    try {
      // The created id is not carried in the URL: `MapWorkspace` does not
      // read a query-driven selection, so there is nothing to hand it to.
      await reportNeed({
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
      setError(cause instanceof Error ? cause.message : NEED_FORM.failed);
    }
  }

  const categoryField = (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">
        {NEED_FORM.category}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {NEED_CATEGORIES.map((option) => {
          const Icon = NEED_CATEGORY_ICON[option];
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
              {NEED_CATEGORY_LABEL[option]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  const descriptionField = (
    <Field label={NEED_FORM.description} required>
      <Textarea
        required
        rows={3}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder={NEED_FORM.descriptionPlaceholder}
      />
    </Field>
  );

  // Barrio and the pin it frames: one pair, so the two travel together into
  // the map pane on a desktop instead of splitting across the fields either
  // side of it. There the barrio floats over the map (see `ReportMapPane`);
  // here on a phone they stay stacked.
  const barrioField = (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold">
        {NEED_FORM.barrio}
        <RequiredMark />
      </label>
      <BarrioPicker barrios={barrios} value={barrio} onChange={setBarrio} />
    </div>
  );

  const mapField = ready ? (
    <PinPicker
      center={[point.lng, point.lat]}
      focusLongitude={barrio?.longitude ?? null}
      focusLatitude={barrio?.latitude ?? null}
      onMove={handleMove}
      className="lg:h-full"
    />
  ) : (
    <div className="bg-muted h-56 rounded-xl border lg:h-full" />
  );

  // Published on the card, so the warning is part of the block rather than a
  // note somewhere else on the page: whatever goes in here is visible to
  // anyone, and half of these reports are written about somebody else's
  // house. The copy is the only protection this data has left — nothing
  // downstream can take a published address back.
  const contactBlock = (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-semibold">{NEED_FORM.contactTitle}</p>
        <p className="text-muted-foreground text-xs">{NEED_FORM.contactHint}</p>
      </div>
      <Field label={NEED_FORM.exactAddress}>
        <Input value={exactAddress} onChange={(e) => setExactAddress(e.target.value)} />
      </Field>
      <Field label={NEED_FORM.contactName}>
        <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
      </Field>
      <Field label={NEED_FORM.phone}>
        <Input
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="3001234567"
        />
      </Field>
      <Field label={NEED_FORM.notes}>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </div>
  );

  const footer = (
    <>
      {error && (
        <p role="alert" className="text-pending text-sm font-medium">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending}>
        {pending ? NEED_FORM.submitting : NEED_FORM.submit}
      </Button>
    </>
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(submit);
  }

  // From `lg` the map gets its own column instead of sitting inline between
  // the fields — see `ReportLayout` for why the page can afford it. Below
  // `lg` this is exactly the single flowing column it always was.
  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {categoryField}
          {descriptionField}
          {barrioField}
          {mapField}
          {contactBlock}
          {footer}
        </form>
      </div>
    );
  }

  return (
    <div className={REPORT_SPLIT}>
      <div className="flex min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 pb-5">{header}</div>
        <form onSubmit={handleSubmit} className={REPORT_FIELDS_PANE}>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
            {categoryField}
            {descriptionField}
            {contactBlock}
          </div>
          <div className="flex shrink-0 flex-col gap-3 pt-4">{footer}</div>
        </form>
      </div>

      <ReportMapPane control={barrioField} invalid={attempted && !barrio}>
        {mapField}
      </ReportMapPane>
    </div>
  );
}
