"use client";

import { CONFIDENCE_BADGE, RESOURCE_TYPE_ICON, RESOURCE_TYPE_LABEL, SERVICES_LABEL, confidence, freshness } from "@/lib/labels";
import { cn } from "@/lib/utils";

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
            {resourceOffers.map((offer) => {
              const Icon = RESOURCE_TYPE_ICON[offer.type];
              const { label: freshLabel, stale } = freshness(offer.confirmedAt);
              const { label: confidenceLabel, level } = confidence(offer);

              return (
                <li key={offer.id}>
                  <a
                    href={`https://wa.me/${offer.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:bg-accent focus-visible:ring-ring flex h-full flex-col gap-1.5 rounded-lg border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
                        {/* `area` is barrio text set by the reporter and
                            `neighborhood` is that same barrio, stamped by
                            geometry — the form's point is the barrio's own
                            centroid, so today they always agree. Shown once,
                            not twice, in case a future writer (the MCP bulk
                            load) ever supplies a real point whose barrio
                            differs from the area text it typed. */}
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
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
