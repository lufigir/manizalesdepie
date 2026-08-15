"use client";

import { useState, useTransition } from "react";
import { MapPin, Navigation, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUpdateCall,
  deleteCall,
  setCallPublished,
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
  callState,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { AdminActions } from "./admin-actions";
import { ShareButton } from "./share-button";
import { RelocateCall } from "./relocate-call";
import { useWorkspace } from "./workspace-context";

/**
 * The card that opens on a grupo's pin.
 *
 * Same anchoring as a site's card and for the same reason — the answer and its
 * place on the map have to stay on screen together — but the order inside is
 * different, because the questions are different. A site is read as "¿qué
 * reciben aquí?"; a grupo is read as "¿dónde exactamente, y siguen ahí?" —
 * which is why the address block sits above everything else and the state
 * badge rides the eyebrow row.
 */
export function CallPopup({ call }: { call: CallDTO }) {
  const { isAdmin } = useWorkspace();
  const [pending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [description, setDescription] = useState(call.description ?? "");
  const [meetingAddress, setMeetingAddress] = useState(call.meetingAddress ?? "");
  const [whatsapp, setWhatsapp] = useState(call.whatsapp ?? "");

  function saveEdit() {
    setEditError(null);
    startTransition(async () => {
      try {
        await adminUpdateCall({
          id: call.id,
          description,
          meetingAddress,
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

  return (
    <div className="flex flex-col gap-1.5">
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
          {/* State on the eyebrow row, confidence demoted to the meta row
              below. Two badges on a row of their own said the loud thing and
              the quiet thing in the same voice; only one of them decides
              whether somebody gets in the car, and neither should be taking
              width from the title. */}
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-[0.65rem] font-semibold tracking-wide uppercase">
              {CALL_CATEGORY_LABEL[call.category]}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] leading-tight font-semibold",
                CALL_STATE_STYLE[state],
              )}
            >
              {CALL_STATE_LABEL[state]}
            </span>
          </div>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {call.title}
          </h2>
        </div>
      </header>

      {/* "Dónde exactamente" is the one fact this card exists to deliver.
          There is no hour to print beside it: `startsAt` is the instant
          somebody reported the grupo, not a time anyone chose, and rendering
          it as a clock time would be the one claim this pin cannot back up.
          The state badge above says what is actually known. */}
      <div className="bg-muted/50 flex flex-col gap-0.5 rounded-md px-2 py-1.5">
        {(call.meetingAddress || call.neighborhood) && (
          <p className="flex items-start gap-1.5 text-xs leading-snug font-semibold">
            <MapPin className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {call.meetingAddress ?? call.neighborhood}
              {call.meetingAddress && call.neighborhood && (
                <span className="text-muted-foreground font-normal">
                  {" · "}
                  {call.neighborhood}
                </span>
              )}
            </span>
          </p>
        )}
      </div>

      {/* In full, not clamped to two lines. The meeting point that used to be
          repeated behind "ver más" is already in the block above, so the fold
          was hiding one thing: the rest of this paragraph. */}
      {call.description && (
        <p className="text-[0.75rem] leading-snug whitespace-pre-line">
          {call.description}
        </p>
      )}

      <RelocateCall call={call} />

      {/* Wraps rather than squeezing three labelled controls onto one
          20rem row. */}
      <div className="flex flex-wrap gap-1.5">
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
        <ShareButton
          path={`/grupo/${call.id}`}
          title={call.title}
          text={call.description ?? call.title}
          className="flex-1"
        />
      </div>

      {isAdmin && (
        <div className="border-t pt-2">
          {editOpen ? (
            <div className="flex flex-col gap-1.5">
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
            published={call.published}
            onSetPublished={(published) => setCallPublished(call.id, published)}
            onDelete={() => deleteCall(call.id)}
          />
        </div>
      )}
    </div>
  );
}
