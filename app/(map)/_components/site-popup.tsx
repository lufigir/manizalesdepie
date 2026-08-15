"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Navigation, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUpdateSite,
  confirmSiteStatus,
  deleteSite,
  setSitePublished,
  verifySite,
} from "@/data/site/site.actions";
import type { SiteDTO } from "@/data/site/site.dto";
import {
  ADMIN_LABEL,
  ITEM_MODE_LABEL,
  SHEET_LABEL,
  SITE_STATUS_LABEL,
  SITE_STATUS_MARKER,
  SITE_STATUS_STYLE,
  SITE_TYPE_ICON,
  SITE_TYPE_LABEL,
  confidence,
  freshness,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { AdminActions } from "./admin-actions";
import { MoreDetails } from "./more-details";
import { ShareButton } from "./share-button";
import { useWorkspace } from "./workspace-context";

/**
 * What a site's card says. Where it opens is `MapCard`'s decision, not this
 * component's — anchored to the pin beside the map, a drawer along the bottom
 * edge under it.
 *
 * That split is the correction to what this comment used to claim. The card
 * replaced a bottom sheet for a spatial reason that was real: a sheet covers
 * the map, so the reader loses the one thing they came for. What the reason
 * did not survive was a phone, where the anchored popup was being pinned
 * inside a region barely taller than itself. The drawer answers the original
 * objection a different way — it is not modal, the map above stays live, and
 * the camera lifts the pin into the space left over.
 *
 * Order inside the card is not cosmetic. What a place REFUSES sits above what
 * it needs, because that is what actually goes wrong: the Red Cross has asked
 * publicly that people stop bringing used clothing, and someone reading in a
 * hurry must hit that before they load the car.
 */
export function SitePopup({ site }: { site: SiteDTO }) {
  const { isAdmin } = useWorkspace();
  const [pending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [name, setName] = useState(site.name);
  const [description, setDescription] = useState(site.description ?? "");
  const [address, setAddress] = useState(site.address ?? "");
  const [schedule, setSchedule] = useState(site.schedule ?? "");
  const [whatsapp, setWhatsapp] = useState(site.whatsapp ?? "");

  function saveEdit() {
    setEditError(null);
    startTransition(async () => {
      try {
        await adminUpdateSite({
          id: site.id,
          name,
          description,
          address,
          schedule,
          whatsapp: whatsapp || undefined,
        });
        setEditOpen(false);
      } catch (cause) {
        setEditError(cause instanceof Error ? cause.message : ADMIN_LABEL.failed);
      }
    });
  }

  const { label: freshLabel, stale } = freshness(site.confirmedAt);
  const { label: confidenceLabel } = confidence(site);
  const Icon = SITE_TYPE_ICON[site.type];

  const needed = site.items
    .filter((item) => item.mode === "needed")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
  const refused = site.items.filter((item) => item.mode === "not_accepted");

  // Confidence, the full schedule, what a site needs, the address, the
  // description, the source link: all real, all pushed behind "ver más".
  // The card kept growing every time one more true fact earned a line, and
  // the fact that mattered least — "hay 6 líneas antes de que aparezca el
  // botón de cómo llegar" — was never any one of them on its own. `needed`
  // is the one item that used to live in the summary and moved here: it is
  // useful, but "no recibe" is the one that is unsafe to miss, so that is
  // the one that stays.
  const hasMore = Boolean(
    site.description || site.address || site.sourceUrl || needed.length > 0,
  );

  /** Freshness and place: the card's quiet line. It shares a row with the
   *  "ver más" trigger when there is one, which is most of the time. */
  const metaLine = (
    <p
      className={cn(
        "text-[0.7rem]",
        stale ? "text-claimed" : "text-muted-foreground",
      )}
    >
      {freshLabel}
      {site.neighborhood && ` · ${site.neighborhood}`}
    </p>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {/* The badge rides on the EYEBROW row, not beside the title.
          Under the title it cost a whole row to say one word; beside the
          title it took that width away from the name of the place, which on
          a 20rem popup is the line that can least afford it. The eyebrow —
          one short word in small caps — is the row that had spare width all
          along. */}
      <header className="flex items-start gap-2">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            SITE_STATUS_MARKER[site.status],
          )}
        >
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-[0.65rem] font-semibold tracking-wide uppercase">
              {SITE_TYPE_LABEL[site.type]}
            </p>
            {/* Confidence used to ride next to status as a second badge. Cut
                for the summary, not for the app: it still shows as the
                marker's solidity on the map itself (CONFIDENCE_MARKER). Full
                text version is one tap away, in "ver más". */}
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] leading-tight font-semibold",
                SITE_STATUS_STYLE[site.status],
              )}
            >
              {SITE_STATUS_LABEL[site.status]}
            </span>
          </div>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {site.name}
          </h2>
        </div>
      </header>

      {!hasMore && metaLine}

      {hasMore && (
        <MoreDetails title={site.name} subtitle={confidenceLabel} meta={metaLine}>
          {site.schedule && (
            <div>
              <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                {SHEET_LABEL.schedule}
              </p>
              <p>{site.schedule}</p>
            </div>
          )}
          {needed.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-[0.65rem] font-semibold tracking-wide uppercase">
                {ITEM_MODE_LABEL.needed}
              </p>
              <ul className="flex flex-wrap gap-1">
                {needed.map((item) => (
                  <li
                    key={item.id}
                    className="bg-resolved-surface text-resolved border-resolved/25 rounded px-1.5 py-0.5 text-xs font-medium"
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {site.address && (
            <div>
              <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                {SHEET_LABEL.address}
              </p>
              <p>{site.address}</p>
            </div>
          )}
          {site.description && (
            <div>
              <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                {SHEET_LABEL.description}
              </p>
              <p className="leading-snug whitespace-pre-line">
                {site.description}
              </p>
            </div>
          )}
          {site.sourceUrl && (
            <a
              href={site.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary flex items-center gap-1.5 text-xs font-semibold"
            >
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              {SHEET_LABEL.source}
            </a>
          )}
        </MoreDetails>
      )}

      {refused.length > 0 && (
        <div className="border-unclaimed/25 bg-unclaimed-surface rounded-md border px-2 py-1.5">
          <p className="text-unclaimed text-[0.65rem] font-bold tracking-wide uppercase">
            {ITEM_MODE_LABEL.not_accepted}
          </p>
          <p className="text-unclaimed text-[0.7rem] leading-snug font-medium">
            {refused.map((item) => item.label).join(" · ")}
          </p>
        </div>
      )}

      {/* Wraps rather than squeezing: with three labelled controls on a
          20rem popup, a second row reads better than three truncated ones. */}
      <div className="flex flex-wrap gap-1.5">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold"
        >
          <Navigation className="size-3.5" aria-hidden />
          {SHEET_LABEL.directions}
        </a>
        {site.whatsapp && (
          <a
            href={`https://wa.me/${site.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary text-secondary-foreground rounded-md px-2 py-2 text-xs font-semibold"
          >
            {SHEET_LABEL.whatsapp}
          </a>
        )}
        <ShareButton path={`/punto/${site.id}`} title={site.name} className="flex-1" />
      </div>

      {/* The mechanism that keeps this from becoming a list of places that
          closed on Tuesday. One tap, no account. */}
      <div className="border-t pt-1.5">
        <p className="text-muted-foreground mb-1 text-[0.65rem]">
          {SHEET_LABEL.confirmPrompt}
        </p>
        <div className="grid grid-cols-3 gap-1">
          {(["open", "full", "closed"] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await confirmSiteStatus(site.id, status);
                })
              }
              className={cn(
                "rounded border px-1 py-1.5 text-[0.7rem] font-semibold disabled:opacity-50",
                SITE_STATUS_STYLE[status],
              )}
            >
              {SITE_STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="border-t pt-2">
          {editOpen ? (
            <div className="flex flex-col gap-1.5">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={ADMIN_LABEL.fieldName} />
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={ADMIN_LABEL.fieldDescription}
              />
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={ADMIN_LABEL.fieldAddress}
              />
              <Input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder={ADMIN_LABEL.fieldSchedule}
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
            published={site.published}
            onSetPublished={(published) => setSitePublished(site.id, published)}
            verified={site.verified}
            onVerify={() => verifySite(site.id)}
            onDelete={() => deleteSite(site.id)}
          />
        </div>
      )}
    </div>
  );
}
