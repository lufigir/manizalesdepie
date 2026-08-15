"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Pencil,
  Share2,
  Users,
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
  adminUpdateCall,
  deleteCall,
  setCallPublished,
  verifyCall,
} from "@/data/call/call.actions";
import type { CallDTO } from "@/data/call/call.dto";
import {
  ADMIN_LABEL,
  CALL_CATEGORY_ICON,
  CALL_CATEGORY_LABEL,
  CALL_LABEL,
  CALL_STATE_LABEL,
  CALL_STATE_MARKER,
  CALL_STATE_STYLE,
  CONFIDENCE_BADGE,
  SHEET_LABEL,
  callState,
  callWhen,
  confidence,
  slotsLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { AdminActions } from "./admin-actions";
import { JoinCall } from "./join-call";
import { RelocateCall } from "./relocate-call";
import { useWorkspace } from "./workspace-context";

/**
 * The card that opens on a grupo's pin.
 *
 * Same anchoring as a site's card and for the same reason — the answer and its
 * place on the map have to stay on screen together — but the order inside is
 * different, because the questions are different. A site is read as "¿qué
 * reciben aquí?"; a shift is read as "¿cuándo, dónde exactamente, y qué llevo?",
 * and the last of those is the one that decides whether someone is useful when
 * they arrive.
 */
export function CallPopup({ call }: { call: CallDTO }) {
  const { isAdmin } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [title, setTitle] = useState(call.title);
  const [description, setDescription] = useState(call.description ?? "");
  const [meetingAddress, setMeetingAddress] = useState(call.meetingAddress ?? "");
  const [bring, setBring] = useState(call.bring ?? "");
  const [whatsapp, setWhatsapp] = useState(call.whatsapp ?? "");

  function saveEdit() {
    setEditError(null);
    startTransition(async () => {
      try {
        await adminUpdateCall({
          id: call.id,
          title,
          description,
          meetingAddress,
          bring,
          whatsapp: whatsapp || undefined,
        });
        setEditOpen(false);
      } catch (cause) {
        setEditError(cause instanceof Error ? cause.message : ADMIN_LABEL.failed);
      }
    });
  }

  const state = callState(call);
  const Icon = CALL_CATEGORY_ICON[call.category];
  const { level, label: confidenceLabel } = confidence(call);

  async function share() {
    const url = `${window.location.origin}/grupo/${call.id}`;

    // The native sheet puts WhatsApp first on Android — one tap back into the
    // group the grupo is being organised in.
    if (navigator.share) {
      try {
        await navigator.share({ title: call.title, text: call.title, url });
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
            CALL_STATE_MARKER[state],
          )}
        >
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
            {CALL_CATEGORY_LABEL[call.category]}
          </p>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {call.title}
          </h2>
        </div>
      </header>

      <div className="flex flex-wrap gap-1">
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
            CALL_STATE_STYLE[state],
          )}
        >
          {CALL_STATE_LABEL[state]}
        </span>
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
            CONFIDENCE_BADGE[level],
          )}
        >
          {confidenceLabel}
        </span>
      </div>

      {/* The hour and the headcount used to be two stacked lines; on a
          popup that already has 6+ blocks, that's a full row of height for
          two short facts that fit side by side. Wraps back to two lines on
          its own if the strings run long, so nothing is lost on a narrow
          screen — just not spent by default. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Clock className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          {callWhen(call)}
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 text-[0.7rem]">
          <Users className="size-3.5 shrink-0" aria-hidden />
          {slotsLabel(call)}
          {call.neighborhood && ` · ${call.neighborhood}`}
        </span>
      </div>

      {call.meetingAddress && (
        <p className="text-muted-foreground flex items-start gap-1.5 text-[0.7rem] leading-snug">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {call.meetingAddress}
        </p>
      )}

      {call.description && (
        <p className="flex items-start gap-1 text-[0.75rem] leading-snug">
          {/* Clamped rather than shown in full: a long description was the
              exact thing that pushed this card past the phone's popup cap
              and off screen. The full text is one tap away, not gone. */}
          <span className="line-clamp-2">{call.description}</span>

          <Sheet>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className="text-primary inline-flex shrink-0 items-center gap-0.5 font-semibold"
                />
              }
            >
              {SHEET_LABEL.moreInfo}
              <ChevronRight className="size-3" aria-hidden />
            </SheetTrigger>

            {/* Lateral, matching the site popup's "ver más": the map stays
                visible next to the sheet instead of disappearing under it. */}
            <SheetPopup side="right">
              <SheetHeader>
                <SheetTitle className="text-base">{call.title}</SheetTitle>
              </SheetHeader>
              <SheetPanel className="flex flex-col gap-4 text-sm">
                {call.meetingAddress && (
                  <div>
                    <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                      {CALL_LABEL.meetingPoint}
                    </p>
                    <p>{call.meetingAddress}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                    {SHEET_LABEL.description}
                  </p>
                  <p className="leading-snug whitespace-pre-line">
                    {call.description}
                  </p>
                </div>
              </SheetPanel>
            </SheetPopup>
          </Sheet>
        </p>
      )}

      {/* What to bring sits above the buttons on purpose. Gloves and a shovel
          are the difference between helping and standing around, and nobody
          thinks of it once they are already in the car. */}
      {call.bring && (
        <div className="border-claimed/25 bg-claimed-surface rounded-md border px-2 py-1.5">
          <p className="text-claimed text-[0.65rem] font-bold tracking-wide uppercase">
            {CALL_LABEL.bring}
          </p>
          <p className="text-claimed text-[0.7rem] leading-snug font-medium">
            {call.bring}
          </p>
        </div>
      )}

      <JoinCall call={call} />
      <RelocateCall call={call} />

      <div className="flex gap-1.5">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${call.latitude},${call.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-secondary text-secondary-foreground flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold"
        >
          <Navigation className="size-3.5" aria-hidden />
          {CALL_LABEL.directions}
        </a>
        {call.whatsapp && (
          <a
            href={`https://wa.me/${call.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary text-secondary-foreground rounded-md px-2 py-2 text-xs font-semibold"
          >
            WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={share}
          aria-label={CALL_LABEL.share}
          className="bg-secondary text-secondary-foreground flex items-center justify-center rounded-md px-3.5 py-2"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Share2 className="size-3.5" aria-hidden />
          )}
        </button>
      </div>

      {isAdmin && (
        <div className="border-t pt-2">
          {editOpen ? (
            <div className="flex flex-col gap-1.5">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ADMIN_LABEL.fieldName} />
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={ADMIN_LABEL.fieldDescription}
              />
              <Input
                value={meetingAddress}
                onChange={(e) => setMeetingAddress(e.target.value)}
                placeholder={CALL_LABEL.meetingPoint}
              />
              <Input value={bring} onChange={(e) => setBring(e.target.value)} placeholder={CALL_LABEL.bring} />
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
            published={call.published}
            onSetPublished={(published) => setCallPublished(call.id, published)}
            verified={call.verified}
            onVerify={() => verifyCall(call.id)}
            onDelete={() => deleteCall(call.id)}
          />
        </div>
      )}
    </div>
  );
}
