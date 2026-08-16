"use client";

import Image from "next/image";
import { useTransition } from "react";
import { Check, PawPrint } from "lucide-react";

import {
  deleteAnimal,
  resolveAnimal,
  setAnimalPublished,
} from "@/data/animal/animal.actions";
import type { AnimalDTO } from "@/data/animal/animal.dto";
import {
  ANIMAL_KIND_STYLE,
  ANIMAL_LABEL,
  freshness,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { WhatsappIcon } from "./whatsapp-icon";
import { AdminActions } from "./admin-actions";
import { ShareButton } from "./share-button";
import { useWorkspace } from "./workspace-context";

/**
 * The card that opens when an animal is selected — from its sighting pin, or
 * from its photo on the board.
 *
 * Not the board's own card. That one is a photograph with a caption, sized
 * for a grid where recognising a face is the entire job. This one opens over
 * a map, where the reader has already recognised the animal (or has just been
 * handed the link) and the next move is to write to whoever reported it. So
 * the photo shrinks to a thumbnail and the contact button gets the width.
 *
 * "Visto", never "está en". Nobody knows where a lost animal is — that is
 * what lost means — and a card that implies otherwise sends people to the
 * wrong block.
 */
export function AnimalPopup({ animal }: { animal: AnimalDTO }) {
  const { isAdmin } = useWorkspace();
  const [pending, startTransition] = useTransition();

  const { label: freshLabel } = freshness(animal.lastSeenAt);
  const resolved = animal.resolvedAt !== null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* The photo, the name, the state and how to recognise it, in one
          block. The description sits BESIDE the thumbnail rather than under
          the whole header: at 56px the photo leaves two thirds of the row
          empty, and "café, collar rojo" is exactly what somebody compares
          against the photo it is next to. */}
      <header className="flex items-start gap-2.5">
        <span className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
          {animal.photoUrl ? (
            <Image
              src={animal.photoUrl}
              alt={animal.petName ?? animal.description.slice(0, 60)}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <span className="text-muted-foreground flex h-full items-center justify-center">
              <PawPrint className="size-5" aria-hidden />
              <span className="sr-only">{ANIMAL_LABEL.noPhoto}</span>
            </span>
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Species and state share the eyebrow, so the name keeps the
              whole width of the row beside the photo. */}
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-[0.65rem] font-semibold tracking-wide uppercase">
              {ANIMAL_LABEL[animal.species]}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] leading-tight font-semibold",
                resolved
                  ? "bg-resolved-surface text-resolved border-resolved/30"
                  : ANIMAL_KIND_STYLE[animal.kind],
              )}
            >
              {resolved ? ANIMAL_LABEL.resolved : ANIMAL_LABEL[animal.kind]}
            </span>
          </div>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {animal.petName ?? ANIMAL_LABEL[animal.kind]}
          </h2>

          {/* Never clamped, unlike a site's description: this is the field
              that actually reunites an animal. */}
          <p className="text-[0.75rem] leading-snug">{animal.description}</p>
        </div>
      </header>

      <p className="text-muted-foreground text-[0.7rem]">
        {ANIMAL_LABEL.seenAt} {freshLabel.replace(/^Confirmado /, "")}
        {animal.zone && ` · ${animal.zone}`}
      </p>

      {/* Same shape as every other card: the forward first, at full weight
          and on its own row. It earns the top slot here more than anywhere —
          a lost animal is found by the photo reaching somebody who has seen
          it, which is a forward, not a phone call. */}
      <ShareButton
        path={`/mascota/${animal.id}`}
        title={animal.petName ?? ANIMAL_LABEL[animal.species]}
        text={animal.description}
        className="w-full"
      />

      {/* No "Cómo llegar", ever — not even when the report carries a point.
          The coordinate is where somebody SAW it, and a navigation button
          would turn that into an address to drive to. */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          render={
            <a
              href={`https://wa.me/${animal.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <WhatsappIcon />
          {ANIMAL_LABEL.contact}
        </Button>
      </div>

      {!resolved && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await resolveAnimal(animal.id);
            })
          }
          // Good news, so it keeps the resolved green rather than the
          // neutral outline every other secondary control wears.
          className="text-resolved border-resolved/30 hover:bg-resolved-surface"
        >
          <Check aria-hidden />
          {ANIMAL_LABEL.markResolved}
        </Button>
      )}

      {isAdmin && (
        <div className="border-t pt-2">
          <AdminActions
            published={animal.published}
            onSetPublished={(published) => setAnimalPublished(animal.id, published)}
            onDelete={() => deleteAnimal(animal.id)}
          />
        </div>
      )}
    </div>
  );
}
