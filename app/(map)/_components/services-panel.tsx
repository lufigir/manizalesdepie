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
  verifyResourceOffer,
} from "@/data/resource_offer/resource_offer.actions";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import {
  ADMIN_LABEL,
  CONFIDENCE_BADGE,
  RESOURCE_TYPE_ICON,
  RESOURCE_TYPE_LABEL,
  SERVICES_LABEL,
  confidence,
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
  const { isAdmin } = useWorkspace();
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
  const { label: freshLabel, stale } = freshness(offer.confirmedAt);
  const { label: confidenceLabel, level } = confidence(offer);

  return (
    <li>
      <div className="flex h-full flex-col gap-1.5 rounded-lg border p-3">
        <a
          href={`https://wa.me/${offer.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-visible:ring-ring hover:bg-accent -m-1 flex flex-1 flex-col gap-1.5 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="flex items-start gap-2">
            <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-4" strokeWidth={2.5} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                {RESOURCE_TYPE_LABEL[offer.type]}
                {offer.quantity != null && ` · ${offer.quantity}`}
              </p>
              {/* `area` is barrio text set by the reporter and `neighborhood`
                  is that same barrio, stamped by geometry — the form's point
                  is the barrio's own centroid, so today they always agree.
                  Shown once, not twice, in case a future writer (the MCP
                  bulk load) ever supplies a real point whose barrio differs
                  from the area text it typed. */}
              <p className="text-sm leading-tight font-semibold">
                {offer.neighborhood ?? offer.area}
              </p>
            </div>
          </div>

          <p className="text-sm leading-snug">{offer.description}</p>

          <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
                CONFIDENCE_BADGE[level],
              )}
            >
              {confidenceLabel}
            </span>
            <span
              className={cn(
                "text-[0.65rem]",
                stale ? "text-claimed" : "text-muted-foreground",
              )}
            >
              {freshLabel}
            </span>
          </div>
        </a>

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
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[0.65rem] underline"
              >
                <Pencil className="size-2.5" aria-hidden />
                {ADMIN_LABEL.edit}
              </button>
            )}

            <AdminActions
              published={offer.published}
              onSetPublished={(published) => setResourceOfferPublished(offer.id, published)}
              verified={offer.verified}
              onVerify={() => verifyResourceOffer(offer.id)}
              onDelete={() => deleteResourceOffer(offer.id)}
            />
          </div>
        )}
      </div>
    </li>
  );
}
