"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUpdateResourceOffer,
  deleteResourceOffer,
  setResourceOfferPublished,
} from "@/data/resource_offer/resource_offer.actions";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import {
  ADMIN_LABEL,
  RESOURCE_TYPE_ICON,
  RESOURCE_TYPE_LABEL,
  SERVICES_LABEL,
  freshness,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { AdminActions } from "./admin-actions";
import { useWorkspace } from "./workspace-context";

/**
 * Servicios: what people already have and are willing to lend. Cards, not
 * pins — see workspace-context.ts. A volqueta someone can drive anywhere in
 * the city has no one fixed spot to put a marker on, so the barrio it left
 * from is what the card says instead of where it draws.
 */
export function ServicesPanel() {
  const { resourceOffers } = useWorkspace();

  return <ServicesGrid resourceOffers={resourceOffers} />;
}

function ServicesGrid({
  resourceOffers,
}: {
  resourceOffers: ReturnType<typeof useWorkspace>["resourceOffers"];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {resourceOffers.length === 0 ? (
        <p className="text-muted-foreground p-6 text-center text-sm text-balance">
          {SERVICES_LABEL.empty}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {resourceOffers.map((offer) => (
            <ServiceCard key={offer.id} offer={offer} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceCard({ offer }: { offer: ResourceOfferDTO }) {
  const { isAdmin, select } = useWorkspace();
  const [pending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [description, setDescription] = useState(offer.description);
  const [area, setArea] = useState(offer.area ?? "");
  const [whatsapp, setWhatsapp] = useState(offer.whatsapp);

  function saveEdit() {
    setEditError(null);
    startTransition(async () => {
      try {
        await adminUpdateResourceOffer({ id: offer.id, description, area, whatsapp });
        setEditOpen(false);
      } catch (cause) {
        setEditError(cause instanceof Error ? cause.message : ADMIN_LABEL.failed);
      }
    });
  }

  const Icon = RESOURCE_TYPE_ICON[offer.type];
  const { label: freshLabel, stale } = freshness(
    offer.confirmedAt,
    SERVICES_LABEL.fresh,
  );

  return (
    <li>
      <div className="flex h-full flex-col gap-1.5 rounded-lg border p-3">
        {/*
         * A tile in a browsing grid used to BE the WhatsApp link — the whole
         * card, one tap, straight out of the app. That was fine when the
         * card said nothing a WhatsApp thread wouldn't, but it also meant
         * there was no way to just look: no share, no way to flag it as
         * wrong, and a stray tap sent someone into a stranger's WhatsApp
         * with nothing typed. It opens the same card `ResourceOfferPopup`
         * does everywhere else on the map now — WhatsApp is one of the
         * things that card offers, not the only thing the tile can do.
         */}
        <button
          type="button"
          onClick={() => select(offer.id)}
          className="focus-visible:ring-ring hover:bg-accent -m-1 flex flex-1 flex-col gap-1.5 rounded-md p-1 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {/* One line: icon, then type and barrio as a single title. The
              eyebrow-and-title header cost a second line to say the same two
              words, and this tile is supposed to read in three. */}
          <div className="flex items-center gap-2">
            <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-4" strokeWidth={2.5} aria-hidden />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
              {RESOURCE_TYPE_LABEL[offer.type]}
              <span className="text-muted-foreground font-normal">
                {" "}· {offer.neighborhood ?? offer.area}
              </span>
            </p>
          </div>

          {/* The description clamped, so the tile never grows past three
              lines. The full text is in the popup. */}
          <p className="line-clamp-2 text-sm leading-snug">{offer.description}</p>

          {/* How long ago it went up, coloured when stale. On its own row so
              the stale red is a fact of the offer, not a footnote to the
              title. */}
          <div className="mt-auto flex items-center gap-1 pt-1">
            <span
              className={cn(
                "text-[0.65rem]",
                stale ? "text-claimed" : "text-muted-foreground",
              )}
            >
              {freshLabel}
            </span>
          </div>
        </button>

        {isAdmin && (
          <div className="border-t pt-1.5">
            {editOpen ? (
              <div className="flex flex-col gap-1.5">
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={ADMIN_LABEL.fieldDescription}
                />
                <Input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={ADMIN_LABEL.fieldZone}
                />
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder={ADMIN_LABEL.fieldWhatsapp}
                />
                {editError && (
                  <p role="alert" className="text-unclaimed text-[0.7rem] font-medium">
                    {editError}
                  </p>
                )}
                <div className="flex gap-1">
                  <Button size="sm" loading={pending} onClick={saveEdit}>
                    {pending ? ADMIN_LABEL.saving : ADMIN_LABEL.save}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditOpen(false)}>
                    {ADMIN_LABEL.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3" aria-hidden />
                {ADMIN_LABEL.edit}
              </Button>
            )}

            <AdminActions
              published={offer.published}
              onSetPublished={(published) => setResourceOfferPublished(offer.id, published)}
              onDelete={() => deleteResourceOffer(offer.id)}
            />
          </div>
        )}
      </div>
    </li>
  );
}
