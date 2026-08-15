"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ChevronRight,
  ExternalLink,
  Navigation,
  Pencil,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { useWorkspace } from "./workspace-context";

/**
 * The card that opens on the pin itself.
 *
 * It replaced a bottom sheet, and the reason is spatial: a sheet slides up from
 * the edge and covers the map, so the reader loses the one thing they came for
 * — where this is, relative to everything else. Anchored to the marker, the
 * answer and its place on the map stay on screen together.
 *
 * Order inside the card is not cosmetic. What a place REFUSES sits above what
 * it needs, because that is what actually goes wrong: the Red Cross has asked
 * publicly that people stop bringing used clothing, and someone reading in a
 * hurry must hit that before they load the car.
 */
export function SitePopup({ site }: { site: SiteDTO }) {
  const { isAdmin } = useWorkspace();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

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

  async function share() {
    const url = `${window.location.origin}/punto/${site.id}`;

    // The native sheet puts WhatsApp first on Android — one tap back into the
    // group the question came from.
    if (navigator.share) {
      try {
        await navigator.share({ title: site.name, text: site.name, url });
      } catch {
        // Dismissed. Not an error.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
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
          <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
            {SITE_TYPE_LABEL[site.type]}
          </p>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {site.name}
          </h2>
        </div>
      </header>

      {/* Confidence used to ride next to status as a second badge. Cut for
          the summary, not for the app: it still shows as the marker's
          solidity on the map itself (CONFIDENCE_MARKER), which is where it
          was designed to be read at a glance in the first place — the badge
          here was saying the same thing twice. Full text version is one tap
          away, in "ver más". */}
      <span
        className={cn(
          "self-start rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
          SITE_STATUS_STYLE[site.status],
        )}
      >
        {SITE_STATUS_LABEL[site.status]}
      </span>

      <p
        className={cn(
          "text-[0.7rem]",
          stale ? "text-claimed" : "text-muted-foreground",
        )}
      >
        {freshLabel}
        {site.neighborhood && ` · ${site.neighborhood}`}
        {hasMore && (
          <Sheet>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className="text-primary ml-1 inline-flex items-center gap-0.5 align-middle font-semibold"
                />
              }
            >
              {SHEET_LABEL.moreInfo}
              <ChevronRight className="size-3" aria-hidden />
            </SheetTrigger>

            {/* Lateral, not bottom: this is the second attempt at "ver más".
                A bottom sheet worked but still asked the reader to lose the
                map — same objection the card itself was built to avoid. From
                the side, the pin and the map around it stay in view while
                the detail reads next to them, not over them. */}
            <SheetPopup side="right">
              <SheetHeader>
                <SheetTitle className="text-base">{site.name}</SheetTitle>
                <p className="text-muted-foreground text-xs">
                  {confidenceLabel}
                </p>
              </SheetHeader>
              <SheetPanel className="flex flex-col gap-4 text-sm">
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
              </SheetPanel>
            </SheetPopup>
          </Sheet>
        )}
      </p>

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

      <div className="flex gap-1.5">
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
        <button
          type="button"
          onClick={share}
          aria-label={SHEET_LABEL.share}
          className="bg-secondary text-secondary-foreground flex items-center justify-center rounded-md px-3.5 py-2"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Share2 className="size-3.5" aria-hidden />
          )}
        </button>
      </div>

      {/* The mechanism that keeps this from becoming a list of places that
          closed on Tuesday. One tap, no account. */}
      <div className="border-t pt-2">
        <p className="text-muted-foreground mb-1.5 text-[0.65rem]">
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
