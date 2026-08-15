"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  attendWorkOrder,
  closeWorkOrder,
  updateWorkOrder,
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
    <div className="p-2">
      <ul className="flex flex-col gap-1">
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
    <div className={cn("rounded-lg border p-2", selected && "border-primary bg-accent")}>
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
          same rule as reporting one; see `canUpdateWorkOrder`. */}
      {editOpen ? (
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
      ) : (
        rollup !== "closed" && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="text-muted-foreground hover:text-foreground mt-1.5 inline-flex items-center gap-1 text-[0.65rem] underline"
          >
            <Pencil className="size-2.5" aria-hidden />
            {WORK_ORDER_LABEL.edit}
          </button>
        )
      )}

      {/* "Yo puedo atender" — anonymous, several people can do this for the
          same case. Reveals the contact right in this same flow, once; see
          `WorkOrderDAL.attend`. */}
      {rollup !== "closed" && (
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
            <Button size="sm" className="mt-2 w-full" onClick={() => setAttendOpen(true)}>
              {WORK_ORDER_LABEL.attend}
            </Button>
          )}
        </>
      )}

      {rollup !== "closed" && (
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => close("closed_completed")}
            className="text-muted-foreground hover:text-foreground text-[0.65rem] underline disabled:opacity-50"
          >
            {WORK_ORDER_LABEL.closeCompleted}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => close("closed_by_others")}
            className="text-muted-foreground hover:text-foreground text-[0.65rem] underline disabled:opacity-50"
          >
            {WORK_ORDER_LABEL.closeByOthers}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => close("closed_rejected")}
            className="text-muted-foreground hover:text-foreground text-[0.65rem] underline disabled:opacity-50"
          >
            {WORK_ORDER_LABEL.closeRejected}
          </button>
        </div>
      )}
    </div>
  );
}
