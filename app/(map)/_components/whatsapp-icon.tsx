import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * WhatsApp's own mark, in its own green.
 *
 * The real logo, not a bare word or a generic message bubble from Lucide, is
 * worth the bytes here specifically: WhatsApp is not one channel among
 * several in this city,
 * it is where the relief coordination actually happens, and a reader scanning
 * a card for the way to reach somebody finds a shape they already know
 * before they find any label.
 *
 * `next/image` with a fixed size rather than an inline `<svg>`: the file is
 * the vendor's, unmodified, and keeping it in `public/` means nobody has to
 * decide whether a future version of the mark should be re-pasted into a
 * component.
 *
 * `unoptimized`: it is already an SVG, so Next's optimizer has nothing to do
 * and would only add a round trip.
 */
export function WhatsappIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/whatsapp-icon.svg"
      alt=""
      width={16}
      height={16}
      unoptimized
      aria-hidden
      // `!opacity-100` beats the button's own `[&_svg]:opacity-80`, which is
      // right for a monochrome icon inheriting the text colour and wrong for
      // a brand mark that carries its own.
      className={cn("size-4 !opacity-100", className)}
    />
  );
}
