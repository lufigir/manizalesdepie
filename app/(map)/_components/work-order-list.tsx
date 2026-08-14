"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  claimWorkOrder,
  closeWorkOrder,
  getWorkOrderContact,
} from "@/data/work_order/work_order.actions";
import type {
  WorkOrderContactDTO,
  WorkOrderDTO,
} from "@/data/work_order/work_order.dto";
import {
  WORK_ORDER_CATEGORY_ICON,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_LABEL,
  WORK_ORDER_ROLLUP_LABEL,
  WORK_ORDER_ROLLUP_MARKER,
  WORK_ORDER_ROLLUP_STYLE,
  freshness,
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Debris and damage, in "Ayudar" — its own tab, same reasoning as `CallList`:
 * this is a thing with a lifecycle, not a place with hours, so it does not
 * belong inside the site list. The heading and count live in the tab itself
 * (see PanelTabs), not here — this only ever renders once that tab is showing.
 */
export function WorkOrderList({
  workOrders,
  signedIn,
}: {
  workOrders: WorkOrderDTO[];
  signedIn: boolean;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <ul className="flex flex-col gap-1">
        {workOrders.map((order) => (
          <WorkOrderItem key={order.id} order={order} signedIn={signedIn} />
        ))}
      </ul>
    </div>
  );
}

function WorkOrderItem({
  order,
  signedIn,
}: {
  order: WorkOrderDTO;
  signedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [contact, setContact] = useState<WorkOrderContactDTO | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rollup = workOrderRollup(order.status);
  const Icon = WORK_ORDER_CATEGORY_ICON[order.category];
  const { label: freshLabel } = freshness(order.confirmedAt);

  function claim() {
    setError(null);
    startTransition(async () => {
      try {
        await claimWorkOrder(order.id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : WORK_ORDER_LABEL.failed);
      }
    });
  }

  function close(result: "closed_completed" | "closed_by_others" | "closed_rejected") {
    setError(null);
    startTransition(async () => {
      try {
        await closeWorkOrder(order.id, result);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : WORK_ORDER_LABEL.failed);
      }
    });
  }

  async function loadContact() {
    setLoadingContact(true);
    setError(null);
    try {
      const data = await getWorkOrderContact(order.id);
      setContact(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : WORK_ORDER_LABEL.failed);
    } finally {
      setLoadingContact(false);
    }
  }

  return (
    <li className="rounded-lg border p-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            WORK_ORDER_ROLLUP_MARKER[rollup],
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
          {WORK_ORDER_CATEGORY_LABEL[order.category]}
          {order.neighborhood && ` · ${order.neighborhood}`}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
            WORK_ORDER_ROLLUP_STYLE[rollup],
          )}
        >
          {WORK_ORDER_ROLLUP_LABEL[rollup]}
        </span>
      </div>

      <p className="mt-1 text-xs leading-snug">{order.description}</p>
      <p className="text-muted-foreground mt-0.5 text-[0.65rem]">{freshLabel}</p>

      {error && (
        <p role="alert" className="text-unclaimed mt-1 text-[0.7rem] font-medium">
          {error}
        </p>
      )}

      {order.status === "unclaimed" &&
        (signedIn ? (
          <Button
            size="sm"
            className="mt-2 w-full"
            loading={pending}
            onClick={claim}
          >
            {pending ? WORK_ORDER_LABEL.claiming : WORK_ORDER_LABEL.claim}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full"
            onClick={() =>
              router.push(`/auth/login?next=${encodeURIComponent(pathname)}`)
            }
          >
            {WORK_ORDER_LABEL.needsAccount}
          </Button>
        ))}

      {order.claimedByMe && order.status === "claimed" && (
        <div className="border-claimed/25 bg-claimed-surface mt-2 flex flex-col gap-1.5 rounded-md border p-2">
          <p className="text-claimed text-[0.7rem] font-semibold">
            {WORK_ORDER_LABEL.claimed}
          </p>
          <p className="text-claimed/80 text-[0.65rem] leading-snug">
            {WORK_ORDER_LABEL.claimedHint}
          </p>

          {contact ? (
            <div className="bg-background rounded border p-1.5 text-[0.7rem] leading-snug">
              <p className="font-semibold">{contact.exactAddress}</p>
              {contact.contactName && <p>{contact.contactName}</p>}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="underline">
                  {contact.phone}
                </a>
              )}
              {contact.notes && (
                <p className="text-muted-foreground mt-1">{contact.notes}</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={loadContact}
              disabled={loadingContact}
              className="text-claimed inline-flex items-center gap-1 text-[0.7rem] font-semibold underline disabled:opacity-60"
            >
              <ExternalLink className="size-3" aria-hidden />
              {loadingContact
                ? WORK_ORDER_LABEL.loadingContact
                : WORK_ORDER_LABEL.seeContact}
            </button>
          )}

          <div className="mt-1 grid grid-cols-3 gap-1">
            <Button size="sm" loading={pending} onClick={() => close("closed_completed")}>
              {WORK_ORDER_LABEL.closeCompleted}
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              onClick={() => close("closed_by_others")}
            >
              {WORK_ORDER_LABEL.closeByOthers}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={pending}
              onClick={() => close("closed_rejected")}
            >
              {WORK_ORDER_LABEL.closeRejected}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
