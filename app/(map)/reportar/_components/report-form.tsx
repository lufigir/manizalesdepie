"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findNearbySites, proposeSite } from "@/data/site/site.actions";
import { SITE_TYPES, type SiteType } from "@/data/site/site.dto";
import { REPORT_LABEL, SITE_TYPE_ICON, SITE_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useDraft } from "@/app/_hooks/use-draft";

import { PinPicker } from "./pin-picker";

/** Central Manizales. Only where the picker opens; the reporter moves it. */
const START: [number, number] = [-75.5074, 5.0631];

type Nearby = { id: string; name: string; distanceM: number };

export function ReportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /**
   * The whole form is a draft until it is published.
   *
   * Reporting is done standing on a street: a phone call, a lost signal or a
   * stray back gesture should not erase what someone already typed. It is also
   * the groundwork for deferred sign-up — a form that survives leaving the page
   * is what lets the account be asked for at the end instead of at the door.
   */
  const { value: draft, setValue: setDraft, clear } = useDraft("report:site", {
    type: "collection_point" as SiteType,
    name: "",
    description: "",
    address: "",
    schedule: "",
    whatsapp: "",
  });

  const [point, setPoint] = useState({ lng: START[0], lat: START[1] });
  const [nearby, setNearby] = useState<Nearby[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const field = useCallback(
    (key: keyof typeof draft) => (value: string) =>
      setDraft((current) => ({ ...current, [key]: value })),
    [setDraft],
  );

  // Stable identity so PinPicker's effect does not re-subscribe every render.
  const handleMove = useCallback(
    (lngLat: { lng: number; lat: number }) => setPoint(lngLat),
    [],
  );

  async function submit(formData: FormData, skipDuplicateCheck = false) {
    setError(null);

    // Duplicate detection at the moment of reporting, where it is cheap and
    // where a duplicate can still be turned into a confirmation instead.
    if (!skipDuplicateCheck) {
      const found = await findNearbySites(point.lng, point.lat);
      if (found.length > 0) {
        setNearby(found);
        return;
      }
    }

    for (const [key, value] of Object.entries(draft)) {
      formData.set(key, String(value));
    }
    formData.set("longitude", String(point.lng));
    formData.set("latitude", String(point.lat));

    try {
      const { id } = await proposeSite(formData);
      clear();
      router.push(`/punto/${id}`);
    } catch (cause) {
      // The DAL surfaces schema messages, which carry the useful ones — the
      // out-of-area rejection above all.
      setError(cause instanceof Error ? cause.message : REPORT_LABEL.failed);
    }
  }

  return (
    <form
      action={(formData) => startTransition(() => submit(formData))}
      className="flex flex-col gap-5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">
          {REPORT_LABEL.kind}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {SITE_TYPES.map((option) => {
            const Icon = SITE_TYPE_ICON[option];
            const active = option === draft.type;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setDraft((c) => ({ ...c, type: option }))}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {SITE_TYPE_LABEL[option]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold">{REPORT_LABEL.where}</label>
        <PinPicker center={START} onMove={handleMove} />
        <p className="text-muted-foreground text-xs">
          {REPORT_LABEL.whereHint}
        </p>
      </div>

      <Field label={REPORT_LABEL.name}>
        <Input
          name="name"
          required
          value={draft.name}
          onChange={(e) => field("name")(e.target.value)}
          placeholder={REPORT_LABEL.namePlaceholder}
        />
      </Field>

      <Field label={REPORT_LABEL.description}>
        <Textarea
          name="description"
          rows={3}
          value={draft.description}
          onChange={(e) => field("description")(e.target.value)}
          placeholder={REPORT_LABEL.descriptionPlaceholder}
        />
      </Field>

      <Field label={REPORT_LABEL.address}>
        <Input
          name="address"
          value={draft.address}
          onChange={(e) => field("address")(e.target.value)}
          placeholder={REPORT_LABEL.addressPlaceholder}
        />
      </Field>

      <Field label={REPORT_LABEL.schedule}>
        <Input
          name="schedule"
          value={draft.schedule}
          onChange={(e) => field("schedule")(e.target.value)}
          placeholder={REPORT_LABEL.schedulePlaceholder}
        />
      </Field>

      <Field label={REPORT_LABEL.whatsapp} hint={REPORT_LABEL.whatsappHint}>
        <Input
          name="whatsapp"
          inputMode="numeric"
          value={draft.whatsapp}
          onChange={(e) => field("whatsapp")(e.target.value)}
          placeholder={REPORT_LABEL.whatsappPlaceholder}
        />
      </Field>

      {nearby && (
        <div className="border-claimed/30 bg-claimed-surface flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-claimed text-sm font-semibold">
            {REPORT_LABEL.nearbyTitle}
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {nearby.map((site) => (
              <li key={site.id}>
                <a
                  href={`/punto/${site.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  {site.name}
                </a>
                <span className="text-muted-foreground tabular-nums">
                  {" "}
                  · a {site.distanceM} m
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">
            {REPORT_LABEL.nearbyBody}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={pending}
            onClick={(event) => {
              const form = event.currentTarget.closest("form");
              if (form) {
                startTransition(() => submit(new FormData(form), true));
              }
            }}
          >
            {REPORT_LABEL.nearbyIgnore}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-unclaimed text-sm font-medium">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending}>
        {pending ? REPORT_LABEL.submitting : REPORT_LABEL.submit}
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
