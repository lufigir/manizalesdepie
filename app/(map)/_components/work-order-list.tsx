"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  attendWorkOrder,
  closeWorkOrder,
  deleteWorkOrder,
  setWorkOrderPublished,
  updateWorkOrder,
  verifyWorkOrder,
} from "@/data/work_order/work_order.actions";
import {
  WORK_ORDER_CATEGORIES,
  type WorkOrderCategory,
  type WorkOrderContactDTO,
  type WorkOrderDTO,
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

import { AdminActions } from "./admin-actions";
import { useWorkspace } from "./workspace-context";

/** The share control, in both the places a card can put it — beside
 *  "Yo puedo atender" while the case is open, alone once it is closed. */
function ShareButton({
  copied,
  onShare,
}: {
  copied: boolean;
  onShare: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onShare}
      aria-label={WORK_ORDER_LABEL.share}
      title={copied ? WORK_ORDER_LABEL.shareCopied : WORK_ORDER_LABEL.share}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Share2 className="size-3.5" aria-hidden />
      )}
    </Button>
  );
}

/** What `confirmingClose` names, quoted back in the confirm prompt so
 *  "¿Seguro?" always says seguro of what. */
const CLOSE_ACTION_LABEL: Record<
  "closed_completed" | "closed_by_others" | "closed_rejected",
  string
> = {
  closed_completed: WORK_ORDER_LABEL.closeCompleted,
  closed_by_others: WORK_ORDER_LABEL.closeByOthers,
  closed_rejected: WORK_ORDER_LABEL.closeRejected,
};

/**
 * Debris and damage, in "Ayudar" — its own chip in `UnifiedPanel`, same
 * reasoning as a grupo: this is a thing with a lifecycle, not a place with
 * hours, so it does not belong inside the site list. The heading and count
 * live in the chip itself, not here — this renders once that chip is active,
 * or as one row among others inside "Todo".
 */
export function WorkOrderList({
  workOrders,
  selectedId,
  onSelect,
}: {
  workOrders: WorkOrderDTO[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  if (workOrders.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm text-balance">
        {WORK_ORDER_LABEL.empty}
      </p>
    );
  }

  return (
    <div className="p-1.5">
      <ul className="flex flex-col gap-1.5">
        {workOrders.map((order) => (
          <li key={order.id}>
            <WorkOrderItem
              order={order}
              selected={order.id === selectedId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Exported so the "Todo" merged list (see `entity-list.tsx`) can place this
 * same card among grupos and sitios instead of re-deriving its
 * atender/cerrar/editar interaction from scratch.
 *
 * `onSelect` is optional and separate from every other button on the card
 * on purpose: tapping the header/description flies the map to it and opens
 * its popup, same as any other row — see `EntityCard`. None of "Yo puedo
 * atender", "Editar" or a close button may ever also trigger that, which is
 * why the clickable area is its own `<button>` around only the identifying
 * part of the card, not a click handler on the whole `<div>` those other
 * buttons sit inside of.
 */
export function WorkOrderItem({
  order,
  selected = false,
  onSelect,
}: {
  order: WorkOrderDTO;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { isAdmin } = useWorkspace();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [attendOpen, setAttendOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [attended, setAttended] = useState<{ contact: WorkOrderContactDTO | null } | null>(
    null,
  );

  const [editOpen, setEditOpen] = useState(false);
  const [category, setCategory] = useState<WorkOrderCategory>(order.category);
  const [description, setDescription] = useState(order.description);

  // A close is what takes a case off the map — worth a second tap, the same
  // rule `AdminActions` already follows for delete. Holds which of the three
  // outcomes is waiting on that second tap, or null when none is.
  const [confirmingClose, setConfirmingClose] = useState<
    "closed_completed" | "closed_by_others" | "closed_rejected" | null
  >(null);

  const [copied, setCopied] = useState(false);

  /** Same flow a site and a grupo already have: the native sheet where
   *  there is one — it puts WhatsApp first on Android, one tap back into
   *  the group the case came from — and the clipboard everywhere else. */
  async function share() {
    const url = `${window.location.origin}/necesidad/${order.id}`;
    const title = `${WORK_ORDER_CATEGORY_LABEL[order.category]}${
      order.neighborhood ? ` · ${order.neighborhood}` : ""
    }`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text: order.description, url });
      } catch {
        // Dismissed. Not an error.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const rollup = workOrderRollup(order.status);
  const Icon = WORK_ORDER_CATEGORY_ICON[order.category];
  const { label: freshLabel } = freshness(order.confirmedAt);

  function submitAttend() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await attendWorkOrder({ workOrderId: order.id, name, phone });
        setAttended(result);
        setAttendOpen(false);
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
      } finally {
        setConfirmingClose(null);
      }
    });
  }

  function saveEdit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateWorkOrder({ id: order.id, category, description });
        setEditOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : WORK_ORDER_LABEL.failed);
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-2 transition-colors",
        // The whole card is one hover target, not just the header button
        // sitting inside it — a highlight that only covers the top third of
        // a card this tall reads as broken, not as an affordance.
        selected ? "border-primary bg-accent" : "hover:bg-accent",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(order.id)}
        aria-current={selected}
        disabled={!onSelect}
        className="focus-visible:ring-ring w-full rounded-md text-left disabled:cursor-default focus-visible:ring-2 focus-visible:outline-none"
      >
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

        {!editOpen && <p className="mt-1 text-xs leading-snug">{order.description}</p>}

        <p className="text-muted-foreground mt-0.5 text-[0.65rem]">
          {freshLabel} ·{" "}
          {order.attendeeCount === 0
            ? WORK_ORDER_LABEL.attendeeCountNone
            : order.attendeeCount === 1
              ? WORK_ORDER_LABEL.attendeeCountOne
              : WORK_ORDER_LABEL.attendeeCountMany(order.attendeeCount)}
        </p>
      </button>

      {error && (
        <p role="alert" className="text-unclaimed mt-1 text-[0.7rem] font-medium">
          {error}
        </p>
      )}

      {/* Correcting the case's own details — category, description — never
          the contact, which is not editable from here at all. Anonymous,
          same rule as reporting one; see `canUpdateWorkOrder`. The toggle
          that opens this lives in the footer below, next to the close
          actions — every secondary action for the case in one row, instead
          of "Editar" sitting on its own between the header and the primary
          "Yo puedo atender" button. */}
      {editOpen && (
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1">
            {WORK_ORDER_CATEGORIES.map((option) => {
              const OptionIcon = WORK_ORDER_CATEGORY_ICON[option];
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  aria-pressed={category === option}
                  className={cn(
                    "focus-visible:ring-ring flex items-center gap-1 rounded-full border px-2 py-1 text-[0.7rem] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    category === option
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent",
                  )}
                >
                  <OptionIcon className="size-3" aria-hidden />
                  {WORK_ORDER_CATEGORY_LABEL[option]}
                </button>
              );
            })}
          </div>
          <Textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex gap-1">
            <Button size="sm" loading={pending} onClick={saveEdit}>
              {pending ? WORK_ORDER_LABEL.editSaving : WORK_ORDER_LABEL.editSave}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditOpen(false);
                setCategory(order.category);
                setDescription(order.description);
              }}
            >
              {WORK_ORDER_LABEL.editCancel}
            </Button>
          </div>
        </div>
      )}

      {/* "Yo puedo atender" — anonymous, several people can do this for the
          same case. Reveals the contact right in this same flow, once; see
          `WorkOrderDAL.attend`. */}
      {!editOpen && rollup !== "closed" && (
        <>
          {attended ? (
            <div className="border-claimed/25 bg-claimed-surface mt-2 flex flex-col gap-1.5 rounded-md border p-2">
              <p className="text-claimed text-[0.7rem] font-semibold">
                {WORK_ORDER_LABEL.attendedThanks}
              </p>
              {attended.contact ? (
                <div className="bg-background rounded border p-1.5 text-[0.7rem] leading-snug">
                  <p className="text-muted-foreground text-[0.65rem] font-semibold">
                    {WORK_ORDER_LABEL.attendContactTitle}
                  </p>
                  <p className="font-semibold">{attended.contact.exactAddress}</p>
                  {attended.contact.contactName && <p>{attended.contact.contactName}</p>}
                  {attended.contact.phone && (
                    <a href={`tel:${attended.contact.phone}`} className="underline">
                      {attended.contact.phone}
                    </a>
                  )}
                  {attended.contact.notes && (
                    <p className="text-muted-foreground mt-1">{attended.contact.notes}</p>
                  )}
                  <p className="text-muted-foreground mt-1 text-[0.65rem]">
                    {WORK_ORDER_LABEL.attendContactHint}
                  </p>
                </div>
              ) : (
                <p className="text-claimed/80 text-[0.65rem] leading-snug">
                  {WORK_ORDER_LABEL.attendNoContact}
                </p>
              )}
            </div>
          ) : attendOpen ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={WORK_ORDER_LABEL.attendName}
              />
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={WORK_ORDER_LABEL.attendPhone}
                inputMode="numeric"
              />
              <div className="flex gap-1">
                <Button size="sm" className="flex-1" loading={pending} onClick={submitAttend}>
                  {pending ? WORK_ORDER_LABEL.attending : WORK_ORDER_LABEL.attendSubmit}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAttendOpen(false)}>
                  {WORK_ORDER_LABEL.attendCancel}
                </Button>
              </div>
            </div>
          ) : (
            // Sharing sits beside attending, not down among the text links:
            // forwarding a case to the group with the volqueta in it is a
            // real way of helping, often the only one a given reader has.
            // Icon-only so "Yo puedo atender" keeps the width and stays
            // unambiguously the primary action.
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" className="flex-1" onClick={() => setAttendOpen(true)}>
                {WORK_ORDER_LABEL.attend}
              </Button>
              <ShareButton copied={copied} onShare={share} />
            </div>
          )}
        </>
      )}

      {/* A closed case has no "atender" button to sit next to, so its share
          control goes here instead — the link still resolves, and "ya se
          resolvió" is a useful thing to be able to forward. */}
      {!editOpen && rollup === "closed" && (
        <div className="mt-2 flex">
          <ShareButton copied={copied} onShare={share} />
        </div>
      )}

      {/* Every secondary action for the case, one row: correct it, or say
          what happened to it. Same text-link weight for all four so none
          reads as more official than the others. A close outcome asks twice
          before it runs — it is what takes the case off the map, so a
          mistap here is worse than one on "Editar". */}
      {!editOpen && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {confirmingClose ? (
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.65rem]">
              <span className="text-muted-foreground">
                {WORK_ORDER_LABEL.closeConfirm} {CLOSE_ACTION_LABEL[confirmingClose]}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => close(confirmingClose)}
                className="text-unclaimed font-semibold underline disabled:opacity-50"
              >
                {WORK_ORDER_LABEL.closeConfirmYes}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingClose(null)}
                className="text-muted-foreground hover:text-foreground underline disabled:opacity-50"
              >
                {WORK_ORDER_LABEL.closeConfirmCancel}
              </button>
            </span>
          ) : (
            rollup !== "closed" && (
              <>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[0.65rem] underline"
                >
                  <Pencil className="size-2.5" aria-hidden />
                  {WORK_ORDER_LABEL.edit}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClose("closed_completed")}
                  className="text-muted-foreground hover:text-foreground text-[0.65rem] underline"
                >
                  {WORK_ORDER_LABEL.closeCompleted}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClose("closed_by_others")}
                  className="text-muted-foreground hover:text-foreground text-[0.65rem] underline"
                >
                  {WORK_ORDER_LABEL.closeByOthers}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClose("closed_rejected")}
                  className="text-muted-foreground hover:text-foreground text-[0.65rem] underline"
                >
                  {WORK_ORDER_LABEL.closeRejected}
                </button>
              </>
            )
          )}
        </div>
      )}

      {isAdmin && (
        <AdminActions
          published={order.published}
          onSetPublished={(published) => setWorkOrderPublished(order.id, published)}
          verified={order.verified}
          onVerify={() => verifyWorkOrder(order.id)}
          onDelete={() => deleteWorkOrder(order.id)}
        />
      )}
    </div>
  );
}
