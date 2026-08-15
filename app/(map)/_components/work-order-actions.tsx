"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

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
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { AdminActions } from "./admin-actions";
import { ShareButton } from "./share-button";
import { useWorkspace } from "./workspace-context";

type CloseOutcome =
  | "closed_completed"
  | "closed_by_others"
  | "closed_rejected";

/** What `confirmingClose` names, quoted back in the confirm prompt so
 *  "¿Seguro?" always says seguro of what. */
const CLOSE_ACTION_LABEL: Record<CloseOutcome, string> = {
  closed_completed: WORK_ORDER_LABEL.closeCompleted,
  closed_by_others: WORK_ORDER_LABEL.closeByOthers,
  closed_rejected: WORK_ORDER_LABEL.closeRejected,
};

/**
 * Everything a reader can DO to a case: attend it, share it, correct it,
 * say what happened to it, and — for a curator — hide or delete it.
 *
 * Split out of the list row so the map popup can hold the same actions
 * without being the same shape. The popup used to render the list row
 * verbatim, which is why a case's card on the map looked nothing like a
 * sitio's or a grupo's: those two have popups written for a popup, and this
 * one was a list item wearing a popup's frame. Now both surfaces present
 * the case in their own idiom and share this, the part that must not drift.
 */
export function WorkOrderActions({ order }: { order: WorkOrderDTO }) {
  const { isAdmin } = useWorkspace();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [attendOpen, setAttendOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [attended, setAttended] = useState<{
    contact: WorkOrderContactDTO | null;
  } | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [category, setCategory] = useState<WorkOrderCategory>(order.category);
  const [description, setDescription] = useState(order.description);

  // A close is what takes a case off the map — worth a second tap, the same
  // rule `AdminActions` already follows for delete. Holds which of the three
  // outcomes is waiting on that second tap, or null when none is.
  const [confirmingClose, setConfirmingClose] = useState<CloseOutcome | null>(
    null,
  );

  const rollup = workOrderRollup(order.status);
  const open = rollup !== "closed";

  function submitAttend() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await attendWorkOrder({
          workOrderId: order.id,
          name,
          phone,
        });
        setAttended(result);
        setAttendOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : WORK_ORDER_LABEL.failed);
      }
    });
  }

  function close(result: CloseOutcome) {
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
    <>
      {error && (
        <p role="alert" className="text-unclaimed mt-1 text-[0.7rem] font-medium">
          {error}
        </p>
      )}

      {/* Correcting the case's own details — category, description — never
          the contact, which is not editable from here at all. Anonymous,
          same rule as reporting one; see `canUpdateWorkOrder`. */}
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
      {!editOpen && open && (
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
                  {attended.contact.contactName && (
                    <p>{attended.contact.contactName}</p>
                  )}
                  {attended.contact.phone && (
                    <a href={`tel:${attended.contact.phone}`} className="underline">
                      {attended.contact.phone}
                    </a>
                  )}
                  {attended.contact.notes && (
                    <p className="text-muted-foreground mt-1">
                      {attended.contact.notes}
                    </p>
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
                <Button
                  size="sm"
                  className="flex-1"
                  loading={pending}
                  onClick={submitAttend}
                >
                  {pending ? WORK_ORDER_LABEL.attending : WORK_ORDER_LABEL.attendSubmit}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAttendOpen(false)}>
                  {WORK_ORDER_LABEL.attendCancel}
                </Button>
              </div>
            </div>
          ) : (
            // Sharing sits beside attending: forwarding a case to the group
            // with the volqueta in it is a real way of helping, often the
            // only one a given reader has. Icon-only so "Yo puedo atender"
            // keeps the width and stays unambiguously the primary action.
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" className="flex-1" onClick={() => setAttendOpen(true)}>
                {WORK_ORDER_LABEL.attend}
              </Button>
              <OrderShareButton order={order} />
            </div>
          )}
        </>
      )}

      {/* A closed case has no "atender" button to sit next to, so its share
          control goes here instead — the link still resolves, and "ya se
          resolvió" is a useful thing to be able to forward. */}
      {!editOpen && !open && (
        <div className="mt-2 flex">
          <OrderShareButton order={order} />
        </div>
      )}

      {/* Every secondary action for the case, one row: correct it, or say
          what happened to it. Same text-link weight for all four so none
          reads as more official than the others. A close outcome asks twice
          before it runs — it is what takes the case off the map, so a
          mistap here is worse than one on "Editar". */}
      {!editOpen && open && (
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
            <>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[0.65rem] underline"
              >
                <Pencil className="size-2.5" aria-hidden />
                {WORK_ORDER_LABEL.edit}
              </button>
              {(["closed_completed", "closed_by_others", "closed_rejected"] as const).map(
                (outcome) => (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => setConfirmingClose(outcome)}
                    className="text-muted-foreground hover:text-foreground text-[0.65rem] underline"
                  >
                    {CLOSE_ACTION_LABEL[outcome]}
                  </button>
                ),
              )}
            </>
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
    </>
  );
}

/**
 * The share control, in both the places a card can put it — beside "Yo puedo
 * atender" while the case is open, alone once it is closed.
 *
 * A thin wrapper over the shared `ShareButton` rather than its own copy of
 * the flow: this file used to carry a second implementation of
 * navigator.share-then-clipboard, and it was the one that crashed on a phone
 * over plain http, because `navigator.clipboard` does not exist outside a
 * secure context. One implementation cannot drift from itself.
 */
function OrderShareButton({ order }: { order: WorkOrderDTO }) {
  return (
    <ShareButton
      path={`/necesidad/${order.id}`}
      title={`${WORK_ORDER_CATEGORY_LABEL[order.category]}${
        order.neighborhood ? ` · ${order.neighborhood}` : ""
      }`}
      text={order.description}
    />
  );
}
