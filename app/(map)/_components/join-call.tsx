"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Moon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinCall } from "@/data/call/call.actions";
import type { CallDTO } from "@/data/call/call.dto";
import { CURFEW_LABEL, isCurfew } from "@/lib/curfew";
import { CALL_STATE_LABEL, JOIN_LABEL, callState } from "@/lib/labels";

/**
 * "Quiero participar", the app's one-tap commitment.
 *
 * Two decisions shape everything here:
 *
 *   - No account. Signing up is one optional field, because the spontaneous
 *     volunteer — most of who turns up in the first week — will not create one,
 *     and a headcount without a phone number is still worth having.
 *   - The signup is remembered in this browser. Without an account there is
 *     nothing to deduplicate an anonymous person by, so the row is not what
 *     tells them they already said yes; this is. Coming back to a shift you
 *     joined and being asked again reads as if the first tap did nothing.
 */
export function JoinCall({ call }: { call: CallDTO }) {
  const [pending, startTransition] = useTransition();
  const { joined, remember } = useJoinedLocally(call.id);

  const [open, setOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);

  /**
   * The curfew is read after mount, never during render.
   *
   * It depends on the current hour, so deciding it on the server would produce
   * one string there and another in the browser at 4:59 a. m. — a hydration
   * mismatch on the one screen where a torn tree costs someone a morning.
   */
  const [curfew, setCurfew] = useState(false);
  useEffect(() => {
    // Setting state from an effect, deliberately: the value is the wall clock,
    // which does not exist as a render-safe input. This is the external-store
    // case the rule is not aimed at.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurfew(isCurfew());
  }, []);

  const state = callState(call);

  if (state === "ended" || state === "full") {
    return (
      <p className="text-muted-foreground rounded-md border px-2.5 py-2 text-xs font-medium">
        {CALL_STATE_LABEL[state]}
      </p>
    );
  }

  if (joined) {
    return (
      <div className="border-resolved/30 bg-resolved-surface flex items-start gap-2 rounded-md border px-2.5 py-2">
        <Check className="text-resolved mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="text-resolved text-xs font-semibold">
            {JOIN_LABEL.joined}
          </p>
          <p className="text-resolved/80 text-[0.7rem] leading-snug">
            {JOIN_LABEL.joinedHint}
          </p>
        </div>
      </div>
    );
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      try {
        await joinCall({
          callId: call.id,
          whatsapp: whatsapp.trim() || undefined,
          // Tapped during curfew hours, when "voy ahora" is not something
          // anyone may act on. The organiser has to be able to tell the
          // difference between someone on their way and someone who meant
          // tomorrow morning.
          forTomorrow: curfew,
        });
        remember();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : JOIN_LABEL.failed);
      }
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-1.5">
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          {curfew ? CURFEW_LABEL.joinTomorrow : JOIN_LABEL.join}
        </Button>
        {curfew && (
          <p className="text-muted-foreground flex items-start gap-1.5 text-[0.7rem] leading-snug">
            <Moon className="mt-0.5 size-3 shrink-0" aria-hidden />
            {CURFEW_LABEL.explain}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-2.5">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold">{JOIN_LABEL.whatsapp}</span>
        <Input
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          inputMode="numeric"
          placeholder="3001234567"
          autoFocus
        />
        <span className="text-muted-foreground text-[0.7rem] leading-snug">
          {JOIN_LABEL.whatsappHint}
        </span>
      </label>

      {error && (
        <p role="alert" className="text-unclaimed text-xs font-medium">
          {error}
        </p>
      )}

      <div className="flex gap-1.5">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          loading={pending}
          onClick={submit}
        >
          {pending ? JOIN_LABEL.submitting : JOIN_LABEL.submit}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          {JOIN_LABEL.cancel}
        </Button>
      </div>
    </div>
  );
}

const STORAGE_KEY = "joined-calls";

/**
 * Which shifts this browser has signed up for.
 *
 * localStorage rather than sessionStorage, unlike the report drafts: a draft
 * belongs to one sitting, but "me apunté para el sábado" has to survive closing
 * the tab on Thursday. It holds call ids and nothing else — no name, no number
 * — so a shared phone gives nothing away beyond which jornadas it joined.
 */
function useJoinedLocally(callId: string) {
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]",
      ) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved.includes(callId)) setJoined(true);
    } catch {
      // Private browsing, a full quota, or a shape that changed. Being asked to
      // sign up twice is a small annoyance; a crashed card is not.
    }
  }, [callId]);

  const remember = useCallback(() => {
    setJoined(true);
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]",
      ) as string[];
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...new Set([...saved, callId])]),
      );
    } catch {
      // See above.
    }
  }, [callId]);

  return { joined, remember };
}
