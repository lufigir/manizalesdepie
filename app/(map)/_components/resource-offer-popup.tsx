"use client";

import { MapPin } from "lucide-react";

import {
  deleteResourceOffer,
  setResourceOfferPublished,
} from "@/data/resource_offer/resource_offer.actions";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import {
  RESOURCE_TYPE_ICON,
  RESOURCE_TYPE_LABEL,
  SERVICES_LABEL,
  freshness,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { AdminActions } from "./admin-actions";
import { ShareButton } from "./share-button";
import { useWorkspace } from "./workspace-context";

/**
 * The card that opens when a service is selected — from its pin, or from its
 * tile in the Servicios grid.
 *
 * Not the grid's tile. That one is a browsing surface: a wall of everything
 * on offer, where the whole tile is one big link to WhatsApp. This one
 * answers a narrower question — "¿esto sigue en pie?" — so how long ago
 * anybody vouched for it rides beside the place instead of in fine print.
 *
 * There is no "Cómo llegar" and there should not be. An offer's point is the
 * barrio's own centroid, not a doorway: "tengo una volqueta" is a
 * barrio-level fact, and a navigation button would dress it up as an address.
 */
export function ResourceOfferPopup({ offer }: { offer: ResourceOfferDTO }) {
  const { isAdmin } = useWorkspace();

  const Icon = RESOURCE_TYPE_ICON[offer.type];
  const { label: freshLabel, stale } = freshness(offer.confirmedAt);

  return (
    <div className="flex flex-col gap-1.5">
      <header className="flex items-start gap-2">
        <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-[0.65rem] font-semibold tracking-wide uppercase">
              {RESOURCE_TYPE_LABEL[offer.type]}
            </p>
          </div>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {offer.description}
          </h2>
        </div>
      </header>

      {/* Where, then how long ago anybody vouched for it. There used to be an
          availability window at full weight above this row; the form asked
          for it 46 times and got an answer none of them, so what an offer
          actually promises is `expiresAt` and what a reader actually wants
          is how stale this is. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {/* `area` is barrio text the offerer typed and `neighborhood` is that
            same barrio stamped by geometry; shown once, preferring the
            stamped one, exactly as the grid tile does. */}
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {offer.neighborhood ?? offer.area ?? SERVICES_LABEL.cityWide}
        </span>
        <span
          className={cn(
            "text-[0.7rem]",
            stale ? "text-claimed" : "text-muted-foreground",
          )}
        >
          {freshLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <a
          href={`https://wa.me/${offer.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground flex flex-1 items-center justify-center rounded-md px-2 py-2 text-xs font-semibold"
        >
          {SERVICES_LABEL.contact}
        </a>
        <ShareButton
          path={`/servicio/${offer.id}`}
          title={RESOURCE_TYPE_LABEL[offer.type]}
          text={offer.description}
          className="flex-1"
        />
      </div>

      {isAdmin && (
        <div className="border-t pt-2">
          <AdminActions
            published={offer.published}
            onSetPublished={(published) =>
              setResourceOfferPublished(offer.id, published)
            }
            onDelete={() => deleteResourceOffer(offer.id)}
          />
        </div>
      )}
    </div>
  );
}
