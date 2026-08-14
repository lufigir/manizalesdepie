"use client";

import { useState } from "react";
import { ChevronDown, Home, PawPrint, ShieldAlert, Users } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SituationReportDTO } from "@/data/situation/situation.dto";
import { SITUATION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The city's balance, as the Alcaldía last published it.
 *
 * Deliberately NOT the chart shapes this was modelled on. The source is a
 * single evening's report: there is no history behind it, so an area chart
 * would have to invent a trend, and a two-slice pie is the documented wrong
 * form for a ratio. What the numbers actually are is ratios against known
 * totals and a handful of headline counts — meters and stat tiles.
 *
 * Nothing here is a series, so nothing here is coloured by identity. The only
 * colour that appears carries state, and it always arrives with its label.
 */
/**
 * "13 de agosto, 9:50 p. m." — assembled from parts rather than handed to
 * Intl's own joiner.
 *
 * Calling `.format()` directly produced a hydration mismatch: Node's ICU joins
 * this locale as "13 de agosto a las 9:50 p. m." and the browser as
 * "13 de agosto, 9:50 p. m.", so the server and client HTML disagreed and React
 * threw the subtree away. Taking the parts and joining them here removes the
 * only piece the two runtimes disagreed about, while still letting Intl do the
 * month name and the a. m./p. m. convention.
 */
const dateParts = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const EXOTIC_SPACES = /[    ⁠]/g;

function normalizeSpaces(value: string): string {
  return value.replace(EXOTIC_SPACES, " ");
}

function formatReportedAt(iso: string): string {
  const parts = dateParts.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    // Node's ICU puts a NARROW NO-BREAK SPACE (U+202F) inside "p. m." where
    // the browser puts an ordinary one. The two strings look identical on
    // screen and even in React's own hydration diff, which is what made this
    // worth a helper rather than a guess.
    normalizeSpaces(parts.find((part) => part.type === type)?.value ?? "");

  return `${get("day")} de ${get("month")}, ${get("hour")}:${get("minute")} ${get("dayPeriod")}`;
}

export function SituationCard({
  report,
  /** Inside the sheet there is nothing to save space from, so the card shows
   *  everything and drops its own toggle. */
  alwaysOpen = false,
}: {
  report: SituationReportDTO;
  alwaysOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const open = alwaysOpen || expanded;

  const reported = formatReportedAt(report.reportedAt);

  return (
    <Card
      className={cn(
        "gap-0",
        alwaysOpen
          ? "w-full border-0 bg-transparent p-0 shadow-none"
          : "bg-card/90 pointer-events-auto w-[min(16rem,calc(100vw-1.5rem))] py-2.5 backdrop-blur",
      )}
    >
      {/* Inside the sheet the drawer supplies the title and there is nothing
          to collapse, so the card's own header would just repeat itself. */}
      {!alwaysOpen && (
      <CardHeader className={cn(alwaysOpen ? "px-0" : "px-3")}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-start justify-between gap-2 text-left"
          >
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                {SITUATION_LABEL.title}
              </p>
              {/* The hero figure. One number leads, because a card of twelve
                  equal numbers has no entry point. */}
              {report.affectedPeople !== null && (
                <p className="text-3xl leading-none font-semibold tabular-nums">
                  {report.affectedPeople.toLocaleString("es-CO")}
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    {SITUATION_LABEL.affected}
                  </span>
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "text-muted-foreground mt-1 size-4 shrink-0 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </CardHeader>
      )}

      {/* Collapsed by default, and that is a mobile decision: expanded, this
          card covered most of a phone's map. The headline number stays visible
          because it is the one figure worth interrupting for; everything else
          is a tap away. */}
      {open && (
        <CardContent className={cn(alwaysOpen ? "px-0" : "px-3")}>
          <AffectedSummary report={report} />

          <div className="mt-4 flex flex-col gap-3 border-t pt-4">
            <Meter
              label={SITUATION_LABEL.evaluations}
              done={report.evalDone}
              total={report.evalRequested}
            />
            <Meter
              label={SITUATION_LABEL.villages}
              done={report.villagesAffected}
              total={report.villagesTotal}
              // More-is-worse here, unlike the evaluation meter where more is
              // progress. Stated in the label rather than left to the colour.
              tone="warning"
            />

            <Split
              label={SITUATION_LABEL.homes}
              parts={[
                { label: SITUATION_LABEL.homesPartial, value: report.homesPartial },
                { label: SITUATION_LABEL.homesTotal, value: report.homesTotalLoss },
              ]}
            />

            <dl className="flex flex-col gap-1 text-xs">
              <Row label={SITUATION_LABEL.injured} value={report.injured} />
              <Row label={SITUATION_LABEL.dead} value={report.dead} />
              <Row label={SITUATION_LABEL.merchants} value={report.merchantsAffected} />
              <Row label={SITUATION_LABEL.gas} value={report.gasPending} />
            </dl>

            {report.notes && (
              <p className="text-muted-foreground text-[11px] leading-snug">
                {report.notes}
              </p>
            )}
          </div>

          <p className="text-muted-foreground mt-3 text-[10px] leading-tight">
            {report.source} · {reported}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function AffectedSummary({ report }: { report: SituationReportDTO }) {
  return (
    <section>
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {SITUATION_LABEL.peopleTitle}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {report.affectedPeople !== null && (
          <SummaryTile
            className="col-span-2"
            icon={Users}
            label={SITUATION_LABEL.affected}
            value={report.affectedPeople}
            prominent
          />
        )}
        <SummaryTile
          icon={ShieldAlert}
          label={SITUATION_LABEL.evacuated}
          value={report.familiesEvacuated}
        />
        <SummaryTile
          icon={Home}
          label={SITUATION_LABEL.inShelters}
          value={report.inShelters}
        />
        <SummaryTile
          icon={PawPrint}
          label={SITUATION_LABEL.petsInShelters}
          value={report.petsInShelters}
        />
      </div>
    </section>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  prominent = false,
  className,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
  prominent?: boolean;
  className?: string;
}) {
  if (value === null) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border bg-background p-2",
        className,
      )}
    >
      <span
        className={cn(
          "bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md",
          prominent && "size-9",
        )}
      >
        <Icon className={cn("size-4", prominent && "size-5")} aria-hidden />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block leading-none font-semibold tabular-nums",
            prominent ? "text-2xl" : "text-base",
          )}
        >
          {value.toLocaleString("es-CO")}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-[10px] leading-tight">
          {label}
        </span>
      </span>
    </div>
  );
}

/**
 * A ratio against a known total. The track is the same hue as the fill, one
 * step lighter — a meter, not a two-slice pie.
 */
function Meter({
  label,
  done,
  total,
  tone = "progress",
}: {
  label: string;
  done: number | null;
  total: number | null;
  tone?: "progress" | "warning";
}) {
  if (done === null || total === null || total === 0) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {done.toLocaleString("es-CO")}
          <span className="text-muted-foreground font-normal">
            {" "}
            / {total.toLocaleString("es-CO")}
          </span>
        </span>
      </div>
      <div
        className={cn(
          "mt-1.5 h-1.5 w-full overflow-hidden rounded-full",
          tone === "warning" ? "bg-claimed-surface" : "bg-verified/15",
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {/* 4px rounded data-end anchored to the track's start. */}
        <div
          className={cn(
            "h-full rounded-full",
            tone === "warning" ? "bg-claimed" : "bg-verified",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Part-to-whole across two parts: a single stacked bar, with a 2px surface
 *  gap between the segments so they never read as one mark. */
function Split({
  label,
  parts,
}: {
  label: string;
  parts: { label: string; value: number | null }[];
}) {
  const present = parts.filter((p) => p.value !== null) as {
    label: string;
    value: number;
  }[];
  if (present.length === 0) return null;

  const total = present.reduce((sum, p) => sum + p.value, 0);

  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="mt-1.5 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
        {present.map((part, index) => (
          <div
            key={part.label}
            className={cn(
              "h-full rounded-full",
              index === 0 ? "bg-claimed" : "bg-unclaimed",
            )}
            style={{ width: `${(part.value / total) * 100}%` }}
          />
        ))}
      </div>
      {/* Direct labels: identity never rests on colour alone. */}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
        {present.map((part, index) => (
          <span key={part.label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                index === 0 ? "bg-claimed" : "bg-unclaimed",
              )}
            />
            <span className="font-semibold tabular-nums">
              {part.value.toLocaleString("es-CO")}
            </span>
            <span className="text-muted-foreground">{part.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {value.toLocaleString("es-CO")}
      </dd>
    </div>
  );
}
