"use client";

import { useCallback, useState, useTransition } from "react";
import { Check, MapPinned } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { relocateCall } from "@/data/call/call.actions";
import type { CallDTO } from "@/data/call/call.dto";
import { RELOCATE_LABEL } from "@/lib/labels";

import { PinPicker } from "../reportar/_components/pin-picker";

/**
 * "Sigue por aquí, no allá" — anyone may nudge a pin. See
 * `canRelocateCall`: nobody committed to this spot, so it is closer to
 * fixing a wiki entry than moving someone else's meeting point.
 *
 * Constrained to the pin's own barrio, but only server-side (see
 * `CallDAL.relocate`) — dragging past the edge is not blocked here,
 * it is rejected on save, with the error the DAL sends back.
 *
 * The picker opens in its own bottom sheet rather than inline in the card:
 * `PinPicker` is a full map with its own controls, and the card anchored to
 * the pin (`max-w-80`, capped height) has no room to spare for a second one.
 * This is not the bottom sheet the card itself rejected twice — there is no
 * map context to lose here, the picker IS the map, so a full-width sheet only
 * gives it more room to work with.
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

  if (done) {
    return (
      <p className="text-resolved flex items-center gap-1.5 text-xs font-medium">
        <Check className="size-3.5 shrink-0" aria-hidden />
        {RELOCATE_LABEL.done}
      </p>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await relocateCall({
          callId: call.id,
          longitude: point.lng,
          latitude: point.lat,
        });
        setDone(true);
        setOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : RELOCATE_LABEL.failed);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium"
          />
        }
      >
        <MapPinned className="size-3.5 shrink-0" aria-hidden />
        {RELOCATE_LABEL.open}
      </SheetTrigger>

      <SheetPopup side="bottom">
        <SheetHeader>
          <SheetTitle className="text-base">{RELOCATE_LABEL.title}</SheetTitle>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-3">
          <PinPicker center={[call.longitude, call.latitude]} onMove={handleMove} />
          <p className="text-muted-foreground text-xs leading-snug">
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
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {RELOCATE_LABEL.cancel}
            </Button>
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
