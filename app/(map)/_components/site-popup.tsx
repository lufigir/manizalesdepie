"use client";

import { useState, useTransition } from "react";
import { Navigation, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUpdateSite,
  confirmSiteStatus,
  deleteSite,
  setSitePublished,
} from "@/data/site/site.actions";
import type { SiteDTO } from "@/data/site/site.dto";
import {
  ADMIN_LABEL,
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

import { WhatsappIcon } from "./whatsapp-icon";
import { AdminActions } from "./admin-actions";
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
  const { level, label: confidenceLabel } = confidence(site);
  const Icon = SITE_TYPE_ICON[site.type];

  /**
   * Freshness, place and confidence: the card's quiet line.
   *
   * Confidence is dropped from it when nobody has confirmed anything, because
   * `freshness` already opens with the same two words — the line read "Sin
   * confirmar ayer · Centro · Sin confirmar", saying it twice and sounding
   * like two separate findings. Once somebody has confirmed, the label
   * carries a fact the freshness half does not ("3 personas confirmaron")
   * and earns its place back.
   */
  const metaLine = (
    <p
      className={cn(
        "text-[0.7rem]",
        stale ? "text-claimed" : "text-muted-foreground",
      )}
    >
      {freshLabel}
      {site.neighborhood && ` · ${site.neighborhood}`}
      {level !== "unconfirmed" && ` · ${confidenceLabel}`}
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
            {/* Confidence used to ride next to status as a second badge. It
                lives on the meta line above now; the marker's own solidity
                (CONFIDENCE_MARKER) still carries it on the map. */}
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

      {metaLine}

      {/* Everything true about the place, in the card itself. It used to fold
          behind "ver más" — a lateral sheet beside the map, an accordion in
          the drawer under it. Both surfaces scroll on their own, so the fold
          was buying a shorter card at the price of a tap on facts (the
          address, the hours) that someone deciding where to drive actually
          reads.

          The "Necesita" chips and the "NO recibe" box are gone: they were a
          second, structured way of saying what the description already says
          in plain words, and keeping the two in sync was a job nobody was
          doing. `site_item` still exists — this is a display decision, not a
          schema one. */}
      <div className="flex flex-col gap-2.5 text-[0.8rem]">
          {site.schedule && (
            <div>
              <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                {SHEET_LABEL.schedule}
              </p>
              <p>{site.schedule}</p>
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
      </div>

      {/* Same shape as every other card: the forward on its own row at full
          weight, then the things you do with the place once you have decided
          to go. See the note on `ShareButton`'s default variant. */}
      <ShareButton path={`/punto/${site.id}`} title={site.name} className="w-full" />

      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          render={
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <Navigation aria-hidden />
          {SHEET_LABEL.directions}
        </Button>
        {site.whatsapp && (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            render={
              <a
                href={`https://wa.me/${site.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <WhatsappIcon />
            {SHEET_LABEL.whatsapp}
          </Button>
        )}
      </div>

      {/* The mechanism that keeps this from becoming a list of places that
          closed on Tuesday. One tap, no account. */}
      <div className="border-t pt-1.5">
        <p className="text-muted-foreground mb-1 text-[0.65rem]">
          {SHEET_LABEL.confirmPrompt}
        </p>
        <div className="grid grid-cols-3 gap-1">
          {(["open", "full", "closed"] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await confirmSiteStatus(site.id, status);
                })
              }
              // Each one wears the status it would set, which is the whole
              // point: the colour is the answer, the word only confirms it.
              className={cn("px-1", SITE_STATUS_STYLE[status])}
            >
              {SITE_STATUS_LABEL[status]}
            </Button>
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
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3" aria-hidden />
              {ADMIN_LABEL.edit}
            </Button>
          )}

          <AdminActions
            published={site.published}
            onSetPublished={(published) => setSitePublished(site.id, published)}
            onDelete={() => deleteSite(site.id)}
          />
        </div>
      )}
    </div>
  );
}
