"use client";

import Image from "next/image";
import { useTransition } from "react";
import { Check, PawPrint } from "lucide-react";

import { resolveAnimal } from "@/data/animal/animal.actions";
import type { AnimalDTO } from "@/data/animal/animal.dto";
import { ANIMAL_KIND_STYLE, ANIMAL_LABEL, freshness } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The animal board: a grid of photographs.
 *
 * This is the one surface in the app where the map is not the product. You
 * recognise a dog by its face, not by a coordinate, so the photo gets the
 * space and the sighting is a caption. A pin here would also assert something
 * false — if we knew where the animal was, it would not be lost.
 */
export function AnimalBoard({
  animals,
  selectedId,
  onSelect,
}: {
  animals: AnimalDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (animals.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm">
        {ANIMAL_LABEL.empty}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 p-2 lg:grid-cols-3">
      {animals.map((animal) => (
        <AnimalCard
          key={animal.id}
          animal={animal}
          selected={animal.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function AnimalCard({
  animal,
  selected,
  onSelect,
}: {
  animal: AnimalDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const { label: freshLabel } = freshness(animal.lastSeenAt);
  const resolved = animal.resolvedAt !== null;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(animal.id)}
        aria-current={selected}
        className={cn(
          "focus-visible:ring-ring w-full overflow-hidden rounded-xl border text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
          selected ? "border-primary" : "hover:border-muted-foreground/40",
          // Reunited animals stay on the board, dimmed. Seeing that it happens
          // is worth the space; competing with the ones still missing is not.
          resolved && "opacity-60",
        )}
      >
        <div className="bg-muted relative aspect-square w-full">
          {animal.photoUrl ? (
            <Image
              src={animal.photoUrl}
              alt={animal.petName ?? animal.description.slice(0, 60)}
              fill
              sizes="(max-width: 768px) 45vw, 200px"
              className="object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <PawPrint className="size-8" aria-hidden />
              <span className="sr-only">{ANIMAL_LABEL.noPhoto}</span>
            </div>
          )}

          <span
            className={cn(
              "absolute top-1.5 left-1.5 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold backdrop-blur",
              resolved
                ? "bg-resolved-surface text-resolved border-resolved/30"
                : ANIMAL_KIND_STYLE[animal.kind],
            )}
          >
            {resolved ? ANIMAL_LABEL.resolved : ANIMAL_LABEL[animal.kind]}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 p-2">
          <p className="truncate text-sm leading-tight font-semibold">
            {animal.petName ?? ANIMAL_LABEL[animal.species]}
          </p>
          <p className="text-muted-foreground line-clamp-2 text-[0.7rem] leading-snug">
            {animal.description}
          </p>
          <p className="text-muted-foreground text-[0.65rem]">
            {ANIMAL_LABEL.seenAt} {freshLabel.replace(/^Confirmado /, "")}
            {animal.zone && ` · ${animal.zone}`}
          </p>
        </div>
      </button>

      <div className="flex gap-1 px-2 pb-2">
        <a
          href={`https://wa.me/${animal.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-secondary text-secondary-foreground flex-1 rounded-md px-2 py-1.5 text-center text-[0.7rem] font-semibold"
        >
          {ANIMAL_LABEL.contact}
        </a>
        {!resolved && (
          <button
            type="button"
            disabled={pending}
            aria-label={ANIMAL_LABEL.markResolved}
            title={ANIMAL_LABEL.markResolved}
            onClick={() =>
              startTransition(async () => {
                await resolveAnimal(animal.id);
              })
            }
            className="bg-resolved-surface text-resolved border-resolved/25 rounded-md border px-2 py-1.5 disabled:opacity-50"
          >
            <Check className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}
