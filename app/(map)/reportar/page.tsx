import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { REPORT_LABEL } from "@/lib/labels";

import { ReportForm } from "./_components/report-form";

export const metadata: Metadata = { title: "Reportar un punto" };

/**
 * The way in for anyone with information.
 *
 * A full route rather than a dialog over the map: the form carries its own map
 * for placing the pin, and two maps stacked in a modal on a phone is a fight
 * over every gesture.
 *
 * No account is asked for anywhere in here. Curation, not registration, is the
 * gate — and after the move to open publication, not even curation holds it
 * back. What holds it is that the pin says "sin confirmar" until the city says
 * otherwise.
 */
export default function ReportPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver al mapa
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {REPORT_LABEL.title}
        </h1>
        <p className="text-muted-foreground text-sm">{REPORT_LABEL.subtitle}</p>
      </header>

      <ReportForm />
    </main>
  );
}
