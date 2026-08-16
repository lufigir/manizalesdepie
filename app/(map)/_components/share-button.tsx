"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { SHEET_LABEL } from "@/lib/labels";

/**
 * Sharing, once, for every card on the map.
 *
 * This is the button the whole product turns on. Nothing here is discovered
 * by browsing to manizalesdepie.co — every reader arrives because somebody
 * pasted a link into a WhatsApp group, and this is the control that produces
 * the next one of those links. It used to be a bare icon in the corner of
 * five different cards, sized like an afterthought next to "Cómo llegar",
 * which is exactly backwards: navigation helps one person, a share reaches
 * forty.
 *
 * So it carries its label and takes real width. It also stops being five
 * copies of the same twenty lines — the native-sheet-then-clipboard flow was
 * written out separately in every card, and the moment one of them drifted,
 * two screens would be sharing differently.
 */
/**
 * Copies, on every browser this actually runs in.
 *
 * `navigator.clipboard` only exists in a secure context, and "secure" does
 * not mean "your phone" — it means https or localhost. Testing this app the
 * way it is meant to be used (a real phone, on the wifi, at
 * `http://192.168.x.x:3000`) is precisely the case where the modern API is
 * undefined, and reading `.writeText` off it threw rather than degrading.
 *
 * `execCommand("copy")` is deprecated and still the only thing that works
 * there, so it stays as the fallback until every device is on https.
 * Everything is guarded: failing to copy a link is a disappointment, not an
 * unhandled rejection.
 */
async function copyToClipboard(url: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Denied or unavailable. Fall through to the old way.
    }
  }

  try {
    const field = document.createElement("textarea");
    field.value = url;
    // Off-screen rather than hidden: a `display: none` field cannot be
    // selected, and iOS will not copy from one it cannot select.
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}

export function ShareButton({
  path,
  title,
  text,
  /**
   * Passed straight through to `Button`. Defaults to `default` — the solid
   * primary one — on every card.
   *
   * That is a deliberate inversion of the usual rule that the primary button
   * belongs to the card's own main action. Nothing in this app is discovered by
   * browsing to the domain: every reader arrived because somebody pasted a
   * link into a WhatsApp group, so the control that produces the NEXT link is
   * the one that grows the map. Contacting, navigating and confirming help
   * one person each; a forward reaches a whole group. They sit below in
   * `secondary`.
   */
  variant = "default",
  size,
  className,
}: {
  /** Path only, e.g. `/punto/abc`. The origin is read at click time so a
   *  link copied on the dev server does not point at production. */
  path: string;
  title: string;
  /** What the native sheet prefills beside the link — the ask, the
   *  description, whatever the receiving group needs to understand the
   *  forward without opening it. */
  text?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;

    // The native sheet puts WhatsApp first on Android — one tap back into the
    // group the question came from.
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url });
      } catch {
        // Dismissed. Not an error.
      }
      return;
    }

    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button variant={variant} size={size} onClick={share} className={className}>
      {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}
      {copied ? SHEET_LABEL.copied : SHEET_LABEL.share}
    </Button>
  );
}
