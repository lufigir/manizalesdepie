import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { REPORT_LABEL } from "@/lib/labels";

/**
 * The frame every report form sits in: a way back to the section it came from,
 * a title, and the promise that publishing is immediate.
 *
 * The back link points at the section rather than at "/" so leaving the form
 * returns to the screen the reporter was reading, not to the app's front door.
 */
export function ReportLayout({
  title,
  subtitle = REPORT_LABEL.subtitle,
  backHref,
  children,
}: {
  title: string;
  /** The promise this particular form makes. Defaults to the one every report
   *  makes — it goes on the map now, marked unconfirmed — which is true of a
   *  point and not quite true of a jornada, where what follows publication is
   *  that people start signing up to it. */
  subtitle?: string;
  backHref: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 py-6">
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

      {children}
    </main>
  );
}
