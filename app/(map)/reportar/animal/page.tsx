import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ANIMAL_FORM } from "@/lib/labels";

import { AnimalForm } from "./_components/animal-form";

export const metadata: Metadata = { title: "Reportar un animal" };

/**
 * Its own route rather than a mode of the site form, because almost nothing is
 * shared: the questions are different, the location is optional, and the photo
 * is the field that matters most. Folding them together would have meant a form
 * that hides half of itself.
 */
export default function ReportAnimalPage() {
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
          {ANIMAL_FORM.title}
        </h1>
        <p className="text-muted-foreground text-sm">{ANIMAL_FORM.subtitle}</p>
      </header>

      <AnimalForm />
    </main>
  );
}
