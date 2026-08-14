"use client";

import { useState } from "react";
import { Check, Clock, MapPin, Navigation, Share2, Users } from "lucide-react";

import type { CallDTO } from "@/data/call/call.dto";
import {
  CALL_CATEGORY_ICON,
  CALL_CATEGORY_LABEL,
  CALL_LABEL,
  CALL_STATE_LABEL,
  CALL_STATE_MARKER,
  CALL_STATE_STYLE,
  CONFIDENCE_BADGE,
  callState,
  callWhen,
  confidence,
  slotsLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { JoinCall } from "./join-call";

/**
 * The card that opens on a jornada's pin.
 *
 * Same anchoring as a site's card and for the same reason — the answer and its
 * place on the map have to stay on screen together — but the order inside is
 * different, because the questions are different. A site is read as "¿qué
 * reciben aquí?"; a shift is read as "¿cuándo, dónde exactamente, y qué llevo?",
 * and the last of those is the one that decides whether someone is useful when
 * they arrive.
 */
export function CallPopup({ call }: { call: CallDTO }) {
  const [copied, setCopied] = useState(false);

  const state = callState(call);
  const Icon = CALL_CATEGORY_ICON[call.category];
  const { level, label: confidenceLabel } = confidence(call);

  async function share() {
    const url = `${window.location.origin}/jornada/${call.id}`;

    // The native sheet puts WhatsApp first on Android — one tap back into the
    // group the jornada is being organised in.
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
    <div className="flex flex-col gap-2.5">
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

      {/* The hour first, and in its own line with an icon. It is the field that
          distinguishes a jornada from every other pin on this map. */}
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Clock className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        {callWhen(call)}
      </p>

      <p className="text-muted-foreground flex items-center gap-1.5 text-[0.7rem]">
        <Users className="size-3.5 shrink-0" aria-hidden />
        {slotsLabel(call)}
        {call.neighborhood && ` · ${call.neighborhood}`}
      </p>

      {call.meetingAddress && (
        <p className="text-muted-foreground flex items-start gap-1.5 text-[0.7rem] leading-snug">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {call.meetingAddress}
        </p>
      )}

      {call.description && (
        <p className="text-[0.75rem] leading-snug">{call.description}</p>
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
          className="bg-secondary text-secondary-foreground flex items-center justify-center rounded-md px-2 py-2"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Share2 className="size-3.5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
