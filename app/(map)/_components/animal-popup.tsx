"use client";

import Image from "next/image";
import { PawPrint } from "lucide-react";

import { deleteAnimal, setAnimalPublished } from "@/data/animal/animal.actions";
import { type AnimalDTO } from "@/data/animal/animal.dto";
import { ANIMAL_KIND_STYLE, ANIMAL_LABEL, freshness } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { WhatsappIcon } from "./whatsapp-icon";
import { AdminActions } from "./admin-actions";
import { DemoContactButton } from "./demo-contact";
import { useDemo } from "./demo-store";
import { ShareButton } from "./share-button";
import { useWorkspace } from "./workspace-context";

/**
 * The card that opens when an animal is selected — from its sighting pin, or
 * from its row in the panel.
 *
 * The photo leads at full width: recognition is the job, not a thumbnail beside
 * a paragraph. Text and actions sit underneath. "Visto", never "está en".
 */
export function AnimalPopup({ animal }: { animal: AnimalDTO }) {
  const { isAdmin } = useWorkspace();
  const demo = useDemo();

  const { label: freshLabel } = freshness(animal.lastSeenAt, ANIMAL_LABEL.fresh);
  const resolved = animal.resolvedAt !== null;

  return (
    <div className="flex flex-col gap-2">
      {/* Full-width photo first — the face is what reunites an animal, so it
          gets the whole row before any text competes for width. */}
      <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-xl">
        {animal.photoUrl?.startsWith("data:") ? (
          // A photo somebody attached during this visit. It never reached a
          // server, so there is nothing for the image optimizer to fetch and
          // `next/image` cannot take a data URL — a plain <img> is the only
          // honest way to show it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={animal.photoUrl}
            alt={animal.petName ?? animal.description.slice(0, 60)}
            className="size-full object-cover"
          />
        ) : animal.photoUrl ? (
          <Image
            src={animal.photoUrl}
            alt={animal.petName ?? animal.description.slice(0, 60)}
            fill
            sizes="(max-width: 1024px) 100vw, 26rem"
            className="object-cover"
            priority
          />
        ) : (
          <span className="text-muted-foreground flex h-full items-center justify-center">
            <PawPrint className="size-12" aria-hidden />
            <span className="sr-only">{ANIMAL_LABEL.noPhoto}</span>
          </span>
        )}

        <span
          className={cn(
            "absolute top-2 left-2 rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold backdrop-blur-sm",
            resolved
              ? "bg-resolved-surface text-resolved border-resolved/30"
              : ANIMAL_KIND_STYLE[animal.kind],
          )}
        >
          {resolved ? ANIMAL_LABEL.resolved : ANIMAL_LABEL[animal.kind]}
        </span>
      </div>

      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
          {ANIMAL_LABEL[animal.species]}
        </p>
        <h2 className="text-base leading-tight font-bold text-balance">
          {animal.petName ?? ANIMAL_LABEL[animal.kind]}
        </h2>
        <p className="text-[0.8rem] leading-snug">{animal.description}</p>
        <p className="text-muted-foreground text-[0.7rem]">
          {freshLabel}
          {animal.zone && ` · ${animal.zone}`}
        </p>
      </header>

      <ShareButton
        path={`/mascota/${animal.id}`}
        title={animal.petName ?? ANIMAL_LABEL[animal.species]}
        text={animal.description}
        className="w-full"
      />

      <DemoContactButton className="w-full">
        <WhatsappIcon />
        {ANIMAL_LABEL.contact}
      </DemoContactButton>

      {isAdmin && (
        <div className="border-t pt-2">
          <AdminActions
            published={animal.published}
            onSetPublished={async (published) =>
              demo.patch(animal.id, await setAnimalPublished(animal.id, published))
            }
            onDelete={async () => {
              await deleteAnimal(animal.id);
              demo.remove(animal.id);
            }}
          />
        </div>
      )}
    </div>
  );
}
