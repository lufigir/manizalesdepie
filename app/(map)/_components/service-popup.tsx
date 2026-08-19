"use client";

import { MapPin, Phone } from "lucide-react";

import {
  deleteService,
  setServicePublished,
} from "@/data/service/service.actions";
import { type ServiceDTO } from "@/data/service/service.dto";
import {
  SERVICE_TYPE_ICON,
  SERVICE_TYPE_LABEL,
  SERVICES_LABEL,
  freshness,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { WhatsappIcon } from "./whatsapp-icon";
import { AdminActions } from "./admin-actions";
import { ShareButton } from "./share-button";
import { useWorkspace } from "./workspace-context";

/**
 * The card that opens when a service is selected — from its pin, or from its
 * row in the panel.
 *
 * The panel row is an index; this card holds the offer, the contact and the
 * ways to correct the listing. There is no "Cómo llegar" — an offer's point
 * is the barrio centroid, not a doorway.
 */
export function ServicePopup({ service }: { service: ServiceDTO }) {
  const { isAdmin } = useWorkspace();

  const Icon = SERVICE_TYPE_ICON[service.type];
  const { label: freshLabel, stale } = freshness(
    service.confirmedAt,
    SERVICES_LABEL.fresh,
  );

  return (
    <div className="flex flex-col gap-1.5">
      <header className="flex items-start gap-2">
        <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-[0.65rem] font-semibold tracking-wide uppercase">
              {SERVICE_TYPE_LABEL[service.type]}
            </p>
          </div>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {service.description}
          </h2>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {service.neighborhood ?? service.area ?? SERVICES_LABEL.cityWide}
        </span>
        <span
          className={cn(
            "text-[0.7rem]",
            stale ? "text-underway" : "text-muted-foreground",
          )}
        >
          {freshLabel}
        </span>
      </div>

      <ShareButton
        path={`/servicio/${service.id}`}
        title={SERVICE_TYPE_LABEL[service.type]}
        text={service.description}
        className="w-full"
      />

      <div className="bg-muted/40 rounded-md border p-2 text-[0.7rem] leading-snug">
        <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
          {SERVICES_LABEL.contactTitle}
        </p>
        <div className="mt-1.5 flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            render={<a href={`tel:${service.whatsapp}`} />}
          >
            <Phone className="size-3.5" aria-hidden />
            {service.whatsapp}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            render={
              <a
                href={`https://wa.me/${service.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <WhatsappIcon />
            {SERVICES_LABEL.contact}
          </Button>
        </div>
      </div>

      {isAdmin && (
        <div className="border-t pt-2">
          <AdminActions
            published={service.published}
            onSetPublished={(published) =>
              setServicePublished(service.id, published)
            }
            onDelete={() => deleteService(service.id)}
          />
        </div>
      )}
    </div>
  );
}
