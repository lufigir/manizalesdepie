import Link from "next/link";
import { Truck } from "lucide-react";

import { SERVICES_LABEL } from "@/lib/labels";
import { DEFAULT_TAB } from "@/lib/tabs";

/**
 * Services, with nothing in it yet.
 *
 * `resource_offer` is not built, so this says so plainly and points at the
 * section that can actually take the offer today. No form: one that discarded
 * what somebody typed during an emergency would be worse than no section.
 */
export function ServicesPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Truck className="size-6" aria-hidden />
      </span>

      <h2 className="text-base font-semibold">{SERVICES_LABEL.title}</h2>

      <p className="text-muted-foreground max-w-sm text-sm text-balance">
        {SERVICES_LABEL.empty} {SERVICES_LABEL.soon}
      </p>

      <p className="text-muted-foreground max-w-sm text-sm text-balance">
        {SERVICES_LABEL.meanwhile}
      </p>

      <Link
        href={DEFAULT_TAB.href}
        className="focus-visible:ring-ring rounded-full border px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
      >
        {SERVICES_LABEL.cta}
      </Link>
    </div>
  );
}
