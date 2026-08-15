"use client";

import { Clock, MapPin } from "lucide-react";

import {
  deleteResourceOffer,
  setResourceOfferPublished,
  verifyResourceOffer,
} from "@/data/resource_offer/resource_offer.actions";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import {
  CONFIDENCE_BADGE,
  RESOURCE_TYPE_ICON,
  RESOURCE_TYPE_LABEL,
  SERVICES_LABEL,
  confidence,
  freshness,
  offerAvailability,
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
 * answers a narrower question — "¿esto sigue en pie y me sirve hoy?" — so
 * the availability window is promoted out of the fine print and given its own
 * line next to the place.
 *
 * There is no "Cómo llegar" and there should not be. An offer's point is the
 * barrio's own centroid, not a doorway: "tengo una volqueta" is a
 * barrio-level fact, and a navigation button would dress it up as an address.
 */
export function ResourceOfferPopup({ offer }: { offer: ResourceOfferDTO }) {
  const { isAdmin } = useWorkspace();

  const Icon = RESOURCE_TYPE_ICON[offer.type];
  const { label: freshLabel, stale } = freshness(offer.confirmedAt);
  const { short: confidenceShort, level } = confidence(offer);

  return (
    <div className="flex flex-col gap-1.5">
      <header className="flex items-start gap-2">
        <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          {/* `short`, not the full sentence: "3 personas confirmaron" beside
              a title is three wrapped lines of badge on a phone. The long
              form still exists for surfaces with room for it. */}
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-[0.65rem] font-semibold tracking-wide uppercase">
              {RESOURCE_TYPE_LABEL[offer.type]}
              {offer.quantity != null && ` · ${offer.quantity}`}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] leading-tight font-semibold",
                CONFIDENCE_BADGE[level],
              )}
            >
              {confidenceShort}
            </span>
          </div>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {offer.description}
          </h2>
        </div>
      </header>

      {/* When and where, then how long ago anybody vouched for it. The window
          leads at full weight: an offer is only worth a call while it is
          still open, and that is the fact this card exists to carry. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Clock className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          {offerAvailability(offer)}
        </span>
        {/* `area` is barrio text the offerer typed and `neighborhood` is that
            same barrio stamped by geometry; shown once, preferring the
            stamped one, exactly as the grid tile does. */}
        <span className="text-muted-foreground flex items-center gap-1.5 text-[0.7rem]">
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
            verified={offer.verified}
            onVerify={() => verifyResourceOffer(offer.id)}
            onDelete={() => deleteResourceOffer(offer.id)}
          />
        </div>
      )}
    </div>
  );
}
