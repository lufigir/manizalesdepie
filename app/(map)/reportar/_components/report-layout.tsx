import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { REPORT_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The frame every report form sits in: a way back to the section it came from,
 * a title, and the promise that publishing is immediate.
 *
 * The back link points at the section rather than at "/" so leaving the form
 * returns to the screen the reporter was reading, not to the app's front door.
 *
 * From `lg` a form that places a pin takes the whole window instead of a
 * centred column: it splits into fields and map, the page stops scrolling,
 * and each pane scrolls on its own. Half a screen of empty margin either side
 * of a 224px map was the worst possible use of a desktop for the one question
 * a reporter can actually get wrong — where.
 *
 * Because the map lives inside each form and the header here, the two halves
 * cannot be siblings in this tree. So `children` of a `split` layout is a
 * function: it receives the header and puts it wherever its own columns
 * want it — at the top of the fields column, with the map running the full
 * height of the right one.
 */
export function ReportLayout({
  title,
  subtitle = REPORT_LABEL.subtitle,
  backHref,
  split = true,
  children,
}: {
  title: string;
  /** The promise this particular form makes. Defaults to the one every report
   *  makes — it goes on the map now, marked unconfirmed — which is true of a
   *  point and not quite true of a grupo, where what follows publication is
   *  that people start signing up to it. */
  subtitle?: string;
  backHref: string;
  /** Whether this form has a second pane to fill the window with. False keeps
   *  the narrow centred column at every width, which is what a form with no
   *  map wants: widening it would buy nothing and cost the reading measure. */
  split?: boolean;
  /** A plain node for a form with no map, or a function receiving the header
   *  for one that has its own columns to place it in. */
  children: React.ReactNode | ((header: React.ReactNode) => React.ReactNode);
}) {
  const header = (
    <ReportHeader title={title} subtitle={subtitle} backHref={backHref} />
  );

  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 py-6",
        split &&
          "lg:mx-0 lg:h-dvh lg:max-w-none lg:gap-5 lg:overflow-hidden lg:px-10 lg:py-7",
      )}
    >
      {typeof children === "function" ? (
        children(header)
      ) : (
        <>
          {header}
          {children}
        </>
      )}
    </main>
  );
}

/**
 * The header that sits on top of every report form: the way back to the
 * section, the title and the promise. Shared so a form that owns its own
 * columns (`split`) can place it, instead of being forced under a full-width
 * bar that wastes the map column's top.
 */
export function ReportHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle: string;
  backHref: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {REPORT_LABEL.back}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </header>
  );
}

/**
 * The two panes a report with a map splits into from `lg`.
 *
 * Shared because the three forms that place a pin all want the same split and
 * the same proportions, and three copies of a width would drift the first time
 * one of them is touched.
 *
 * The split is a CSS grid whose first track caps the fields at 46% of the
 * window, and the form fills that track as a scrolling column. Every extra
 * pixel of a wide monitor goes to the map — a textarea 900px wide is harder to
 * read than one at 600, while a map only ever gets better with more pixels.
 */
export const REPORT_SPLIT =
  "grid h-full min-h-0 flex-1 grid-cols-[minmax(0,46%)_minmax(0,1fr)] gap-10";

/** The fields half of `REPORT_SPLIT`. The grid track sizes it; this only has
 *  to be a column that fills the cell and scrolls on its own. */
export const REPORT_FIELDS_PANE = "flex min-h-0 w-full flex-1 flex-col";

/**
 * The map pane, with the barrio picker floating on top of the map instead of
 * stacked above it.
 *
 * Stacked, the picker ate 340px off the top of the pane and stretched a search
 * box and six-character names across 1100px — the map paid for a control that
 * gained nothing from the width. Floating, the map is the whole pane and the
 * picker is a card over the corner of it, which is also the truer picture of
 * what it does: it aims the map underneath.
 *
 * Desktop only. On a phone there is no pane to float inside and no width to
 * waste, so the two stay stacked exactly as they always were.
 */
export function ReportMapPane({
  control,
  children,
  invalid = false,
}: {
  /** The barrio picker (and anything else that aims the camera). */
  control: React.ReactNode;
  /** The map itself, sized to fill. */
  children: React.ReactNode;
  /** The barrio the pane asks for is still missing. Frames the map in red so
   *  the requirement is read off the surface being acted on, not off an error
   *  that only appears after submitting. */
  invalid?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col",
        invalid && "ring-unclaimed ring-2 ring-inset",
      )}
    >
      {children}
      <div className="bg-background/95 absolute top-3 left-3 z-10 w-[340px] max-w-[calc(100%-1.5rem)] rounded-xl border p-3 shadow-lg backdrop-blur">
        {control}
      </div>
    </div>
  );
}
