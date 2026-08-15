"use client";

import { useState, useTransition } from "react";
import { Navigation, Pencil, Phone, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  attendWorkOrder,
  closeWorkOrder,
  deleteWorkOrder,
  listWorkOrderAttendees,
  setWorkOrderPublished,
  updateWorkOrder,
  verifyWorkOrder,
} from "@/data/work_order/work_order.actions";
import {
  WORK_ORDER_CATEGORIES,
  type WorkOrderAttendeeDTO,
  type WorkOrderCategory,
  type WorkOrderDTO,
} from "@/data/work_order/work_order.dto";
import {
  SHEET_LABEL,
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
  const [note, setNote] = useState("");
  const [attended, setAttended] = useState(false);

  // Loaded on demand rather than with the card: every case on the map would
  // otherwise fetch its own attendee list on first paint, for a panel most
  // readers never open.
  const [attendees, setAttendees] = useState<WorkOrderAttendeeDTO[] | null>(null);
  const [attendeesOpen, setAttendeesOpen] = useState(false);

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
        await attendWorkOrder({
          workOrderId: order.id,
          name,
          phone,
          note: note.trim() || undefined,
        });
        setAttended(true);
        setAttendOpen(false);
        // The list this reader just joined is the one thing worth showing
        // next: it is where their own note lands.
        setAttendees(await listWorkOrderAttendees(order.id));
        setAttendeesOpen(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : WORK_ORDER_LABEL.failed);
      }
    });
  }

  function toggleAttendees() {
    if (attendeesOpen) {
      setAttendeesOpen(false);
      return;
    }
    setAttendeesOpen(true);
    if (attendees) return;
    startTransition(async () => {
      try {
        setAttendees(await listWorkOrderAttendees(order.id));
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

  const hasContact = Boolean(
    order.exactAddress || order.contactName || order.phone || order.notes,
  );

  return (
    <>
      {error && (
        <p role="alert" className="text-unclaimed mt-1 text-[0.7rem] font-medium">
          {error}
        </p>
      )}

      {/* Contact, in the open. It sits above the actions because it is what
          the reader came for: somebody with a volqueta decides whether to
          take this case by looking at where it is and calling to ask, and
          under the old gate they had to commit before they could do either. */}
      {!editOpen && (
        <div className="bg-muted/40 mt-2 rounded-md border p-2 text-[0.7rem] leading-snug">
          <p className="text-muted-foreground text-[0.65rem] font-semibold">
            {WORK_ORDER_LABEL.contactTitle}
          </p>
          {hasContact ? (
            <>
              {order.exactAddress && (
                <p className="font-semibold">{order.exactAddress}</p>
              )}
              {order.contactName && <p>{order.contactName}</p>}
              {order.phone && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<a href={`tel:${order.phone}`} />}
                  >
                    <Phone className="size-3.5" aria-hidden />
                    {order.phone}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <a
                        href={`https://wa.me/57${order.phone}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    {WORK_ORDER_LABEL.contactWhatsapp}
                  </Button>
                </div>
              )}
              {order.notes && (
                <p className="text-muted-foreground mt-1">{order.notes}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{WORK_ORDER_LABEL.noContact}</p>
          )}
        </div>
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
          same case, each leaving a note the others can read. Nothing is
          revealed in return any more: the contact is above, in the open. */}
      {!editOpen && open && (
        <>
          {attended ? (
            <p className="text-claimed mt-2 text-[0.7rem] font-semibold">
              {WORK_ORDER_LABEL.attendedThanks}
            </p>
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
              <Textarea
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={WORK_ORDER_LABEL.attendNotePlaceholder}
                aria-label={WORK_ORDER_LABEL.attendNote}
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
            // The primary action gets its own full-width line; getting there
            // and forwarding it sit under it, equal weight to each other and
            // visibly below the thing this card is asking for.
            <div className="mt-2 flex flex-col gap-1.5">
              <Button size="sm" onClick={() => setAttendOpen(true)}>
                {WORK_ORDER_LABEL.attend}
              </Button>
              <div className="flex gap-1.5">
                <OrderDirectionsButton order={order} />
                <OrderShareButton order={order} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Who is already on it, and what they said they are bringing. This is
          what makes several attendees add up to a plan instead of three
          volquetas on the same corner at the same hour. */}
      {!editOpen && order.attendeeCount > 0 && (
        <div className="mt-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleAttendees}
            aria-expanded={attendeesOpen}
          >
            <Users className="size-3.5" aria-hidden />
            {attendeesOpen
              ? WORK_ORDER_LABEL.attendeesHide
              : WORK_ORDER_LABEL.attendeesShow}
          </Button>

          {attendeesOpen && (
            <ul className="mt-1 flex flex-col gap-1">
              {attendees === null ? (
                <li className="text-muted-foreground text-[0.65rem]">
                  {WORK_ORDER_LABEL.attendeesLoading}
                </li>
              ) : attendees.length === 0 ? (
                <li className="text-muted-foreground text-[0.65rem]">
                  {WORK_ORDER_LABEL.attendeesEmpty}
                </li>
              ) : (
                attendees.map((attendee) => (
                  <li
                    key={attendee.id}
                    className="bg-muted/40 rounded border p-1.5 text-[0.7rem] leading-snug"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{attendee.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        render={<a href={`tel:${attendee.phone}`} />}
                      >
                        <Phone className="size-3.5" aria-hidden />
                        {attendee.phone}
                      </Button>
                    </div>
                    {attendee.note && (
                      <p className="text-muted-foreground mt-0.5">{attendee.note}</p>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {/* A closed case has no "atender" button to sit next to, so its share
          control goes here instead — the link still resolves, and "ya se
          resolvió" is a useful thing to be able to forward. */}
      {!editOpen && !open && (
        <div className="mt-2 flex gap-1.5">
          <OrderDirectionsButton order={order} />
          <OrderShareButton order={order} />
        </div>
      )}

      {/* Every secondary action for the case, one row: correct it, or say
          what happened to it. Same text-link weight for all four so none
          reads as more official than the others. A close outcome asks twice
          before it runs — it is what takes the case off the map, so a
          mistap here is worse than one on "Editar". */}
      {!editOpen && open && (
        <div className="mt-1.5 border-t pt-1.5">
          {confirmingClose ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[0.65rem]">
                {WORK_ORDER_LABEL.closeConfirm} {CLOSE_ACTION_LABEL[confirmingClose]}
              </span>
              <Button
                size="sm"
                variant="destructive"
                loading={pending}
                onClick={() => close(confirmingClose)}
              >
                {WORK_ORDER_LABEL.closeConfirmYes}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmingClose(null)}
              >
                {WORK_ORDER_LABEL.closeConfirmCancel}
              </Button>
            </div>
          ) : (
            // Real buttons on their own row, not four underlined words in a
            // line. Three of them close the case, which is the most
            // consequential thing anyone can do from this card and was the
            // thing dressed to look least like a control.
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3" aria-hidden />
                {WORK_ORDER_LABEL.edit}
              </Button>
              {(["closed_completed", "closed_by_others", "closed_rejected"] as const).map(
                (outcome) => (
                  <Button
                    key={outcome}
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmingClose(outcome)}
                  >
                    {CLOSE_ACTION_LABEL[outcome]}
                  </Button>
                ),
              )}
            </div>
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
/** Only the approximate point: the public row carries a block-level
 *  `approx_location`, which is enough to drive to the corner. */
function OrderDirectionsButton({ order }: { order: WorkOrderDTO }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="flex-1"
      render={
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
        />
      }
    >
      <Navigation className="size-3.5" aria-hidden />
      {SHEET_LABEL.directions}
    </Button>
  );
}

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
