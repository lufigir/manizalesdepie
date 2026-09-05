"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DEMO_LABEL } from "@/lib/labels";

/**
 * A contact button that goes nowhere, on purpose.
 *
 * Every phone number on this map is invented, and an invented Colombian
 * mobile number is somebody's real number. So the buttons that used to open
 * `wa.me` or the dialler keep their place, their weight and their icon —
 * losing them would take the end of the flow out of the demo — and say what
 * they are when pressed instead of dialling a stranger.
 *
 * The number itself stays visible. It is what makes the card look like the
 * card, and it is the thing the note is about.
 */
export function DemoContactButton({
  size = "sm",
  variant = "outline",
  className,
  children,
}: {
  size?: "xs" | "sm";
  variant?: "outline" | "ghost";
  className?: string;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={() => setShown(true)}
      >
        {children}
      </Button>
      {shown && <DemoContactNote onClose={() => setShown(false)} />}
    </>
  );
}

/**
 * Bottom of the screen rather than beside the button: the cards these sit in
 * are 20rem wide and already full, and a note that pushes the contact block
 * around costs the reader the thing they were looking at.
 */
function DemoContactNote({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="status"
      className="bg-background/95 fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-xl border p-3 shadow-lg backdrop-blur"
    >
      <p className="text-sm font-semibold">{DEMO_LABEL.contactTitle}</p>
      <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
        {DEMO_LABEL.contactBody}
      </p>
      <div className="mt-2 flex justify-end">
        <Button size="xs" variant="ghost" onClick={onClose}>
          {DEMO_LABEL.contactClose}
        </Button>
      </div>
    </div>
  );
}
