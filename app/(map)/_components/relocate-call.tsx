"use client";

import { useCallback, useState, useTransition } from "react";
import { Check, MapPinned } from "lucide-react";

import { Button } from "@/components/ui/button";
import { relocateInformalCall } from "@/data/call/call.actions";
import type { CallDTO } from "@/data/call/call.dto";
import { RELOCATE_LABEL } from "@/lib/labels";

import { PinPicker } from "../reportar/_components/pin-picker";

/**
 * "Sigue por aquí, no allá" — anyone may nudge an informal pin, never a
 * formal one. See `canRelocateInformalCall`: there is no organiser here to
 * contradict, so this is closer to fixing a wiki entry than moving someone
 * else's meeting point.
 *
 * Constrained to the pin's own barrio, but only server-side (see
 * `CallDAL.relocateInformal`) — dragging past the edge is not blocked here,
 * it is rejected on save, with the error the DAL sends back.
 */
export function RelocateCall({ call }: { call: CallDTO }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [point, setPoint] = useState({ lng: call.longitude, lat: call.latitude });

  const handleMove = useCallback(
    (lngLat: { lng: number; lat: number }) => setPoint(lngLat),
    [],
  );

  if (!call.informal) return null;

  if (done) {
    return (
      <p className="text-resolved flex items-center gap-1.5 text-xs font-medium">
        <Check className="size-3.5 shrink-0" aria-hidden />
        {RELOCATE_LABEL.done}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium"
      >
        <MapPinned className="size-3.5 shrink-0" aria-hidden />
        {RELOCATE_LABEL.open}
      </button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await relocateInformalCall({
          callId: call.id,
          longitude: point.lng,
          latitude: point.lat,
        });
        setDone(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : RELOCATE_LABEL.failed);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-2.5">
      <p className="text-xs font-semibold">{RELOCATE_LABEL.title}</p>
      <PinPicker center={[call.longitude, call.latitude]} onMove={handleMove} />
      <p className="text-muted-foreground text-[0.7rem] leading-snug">
        {RELOCATE_LABEL.hint}
      </p>
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
          {pending ? RELOCATE_LABEL.saving : RELOCATE_LABEL.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {RELOCATE_LABEL.cancel}
        </Button>
      </div>
    </div>
  );
}
