"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Navigation, Pencil, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  closeWorkOrder,
  deleteWorkOrder,
  listWorkOrderUpdates,
  postWorkOrderUpdate,
  setWorkOrderPublished,
  updateWorkOrder,
} from "@/data/work_order/work_order.actions";
import {
  WORK_ORDER_CATEGORIES,
  type WorkOrderCategory,
  type WorkOrderDTO,
  type WorkOrderUpdateDTO,
  type WorkOrderUpdateKind,
} from "@/data/work_order/work_order.dto";
import {
  SHEET_LABEL,
  WORK_ORDER_CATEGORY_ICON,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_LABEL,
  WORK_ORDER_UPDATE_KIND_LABEL,
  WORK_ORDER_UPDATE_KIND_STYLE,
  WORK_ORDER_UPDATE_KIND_TAG,
  WORK_ORDER_UPDATE_PLACEHOLDER,
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { AdminActions } from "./admin-actions";
import { ShareButton } from "./share-button";
import { useWorkspace } from "./workspace-context";

/** A curator's two manual verdicts. Everyone else's contribution goes
 *  through the book — see `WORK_ORDER_UPDATE_KINDS`. */
type CloseOutcome = "closed_completed" | "closed_rejected";

const CLOSE_ACTION_LABEL: Record<CloseOutcome, string> = {
  closed_completed: WORK_ORDER_LABEL.closeCompleted,
  closed_rejected: WORK_ORDER_LABEL.closeRejected,
};

/**
 * Everything a reader can DO to a case.
 *
 * Two redesigns, one after the other, and the second is why this file is
 * shaped the way it is.
 *
 * The first replaced three "cerrar" buttons — open to anyone, terminal on
 * the first tap — with signed entries in a book, so no one person decides
 * what a case is. The second is this: those entries arrived as four more
 * buttons in a stack that was already nine controls deep, all at the same
 * weight, so the card read as a wall and the eye had to check every label
 * to find the one thing it came for.
 *
 * They are grouped now by the question each one answers, which happens to
 * be the same axis as how much they cost: helping, going, fixing the
 * listing, curating. The order is deliberate — what the card is asking for
 * comes first at full weight, and the two ways of saying "this listing is
 * wrong" sit last and quietest, because they are the ones a mistap hurts.
 *
 * Split out of the list row so the map popup can hold the same actions
 * without being the same shape.
 */
export function WorkOrderActions({ order }: { order: WorkOrderDTO }) {
  const { isAdmin } = useWorkspace();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Which entry the composer is open for, or null when it is shut. One
  // composer for all four kinds: they ask for the same three things and
  // differ only in the sentence they are making.
  const [composing, setComposing] = useState<WorkOrderUpdateKind | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [posted, setPosted] = useState<WorkOrderUpdateKind | null>(null);

  // Loaded on demand rather than with the card: every case on the map would
  // otherwise fetch its own thread on first paint, for a panel most readers
  // never open.
  const [updates, setUpdates] = useState<WorkOrderUpdateDTO[] | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [category, setCategory] = useState<WorkOrderCategory>(order.category);
  const [description, setDescription] = useState(order.description);

  const [confirmingClose, setConfirmingClose] = useState<CloseOutcome | null>(
    null,
  );

  const rollup = workOrderRollup(order.status);
  const open = rollup !== "closed";

  function submitUpdate(kind: WorkOrderUpdateKind) {
    setError(null);

    // The note is the one required field. Catch it here so the Zod error
    // from the server action never leaks as a raw JSON array on screen.
    const trimmedNote = note.trim();
    if (trimmedNote.length < 3) {
      setError(WORK_ORDER_LABEL.attendNoteRequired);
      return;
    }

    startTransition(async () => {
      try {
        await postWorkOrderUpdate({
          workOrderId: order.id,
          kind,
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          note: trimmedNote,
        });
        setPosted(kind);
        setComposing(null);
        setNote("");
        // The thread this reader just joined is the one thing worth showing
        // next: it is where their own note lands, and where they can see
        // that the case did not just switch off.
        setUpdates(await listWorkOrderUpdates(order.id));
        setThreadOpen(true);
      } catch (cause) {
        const msg =
          cause instanceof Error ? cause.message : WORK_ORDER_LABEL.failed;
        // Zod v4 serialises issues as a JSON array in .message — a reader
        // should never see that, so fall back to the generic label.
        setError(msg.startsWith("[") ? WORK_ORDER_LABEL.failed : msg);
      }
    });
  }

  function toggleThread() {
    if (threadOpen) {
      setThreadOpen(false);
      return;
    }
    setThreadOpen(true);
    if (updates) return;
    startTransition(async () => {
      try {
        setUpdates(await listWorkOrderUpdates(order.id));
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

  const entryCount = order.attendeeCount + order.helpedCount;

  /**
   * The composer takes over the whole card while it is open.
   *
   * Rendered before everything else and returned early: it asks for a name,
   * a phone and a paragraph, which on a 20rem popup is the entire viewport.
   * Leaving four more buttons and a contact block underneath it only offers
   * ways to abandon what is being typed.
   */
  if (composing) {
    return (
      <div className="mt-2 flex flex-col gap-1.5 border-t pt-2">
        {error && (
          <p role="alert" className="text-unclaimed text-[0.7rem] font-medium">
            {error}
          </p>
        )}
        <p className="text-sm font-semibold">
          {WORK_ORDER_UPDATE_KIND_LABEL[composing]}
        </p>
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
          placeholder={WORK_ORDER_UPDATE_PLACEHOLDER[composing]}
          aria-label={WORK_ORDER_LABEL.attendNote}
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            className="flex-1"
            loading={pending}
            onClick={() => submitUpdate(composing)}
          >
            {pending ? WORK_ORDER_LABEL.attending : WORK_ORDER_LABEL.attendSubmit}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setComposing(null)}>
            {WORK_ORDER_LABEL.attendCancel}
          </Button>
        </div>
      </div>
    );
  }

  // Same rule as the composer: editing replaces the card rather than sitting
  // inside it.
  if (editOpen) {
    return (
      <div className="mt-2 flex flex-col gap-1.5 border-t pt-2">
        {error && (
          <p role="alert" className="text-unclaimed text-[0.7rem] font-medium">
            {error}
          </p>
        )}
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
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex gap-1">
          <Button size="sm" className="flex-1" loading={pending} onClick={saveEdit}>
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
    );
  }

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
      <div className="bg-muted/40 mt-2 rounded-md border p-2 text-[0.7rem] leading-snug">
        <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
          {WORK_ORDER_LABEL.contactTitle}
        </p>
        {hasContact ? (
          <>
            {order.exactAddress && (
              <p className="mt-0.5 font-semibold">{order.exactAddress}</p>
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
          <p className="text-muted-foreground mt-0.5">
            {WORK_ORDER_LABEL.noContact}
          </p>
        )}

        {/* Forwarding the case belongs with its address and its phone: what
            gets pasted into a WhatsApp group is precisely this block, and
            whoever is looking at it is the person about to pass it on. It
            used to sit beside "Cómo llegar", which is a different job —
            that one is for the person who already decided to go. */}
        <OrderShareButton order={order} className="mt-1.5 w-full" />
      </div>

      {/* What the card is asking for. Full weight, its own section, and the
          only primary button anywhere on it. */}
      {open && (
        <Section label={WORK_ORDER_LABEL.sectionHelp}>
          {posted && (
            <p className="text-resolved text-[0.7rem] font-semibold">
              {WORK_ORDER_LABEL.attendedThanks}
            </p>
          )}
          <Button onClick={() => setComposing("on_the_way")}>
            {WORK_ORDER_UPDATE_KIND_LABEL.on_the_way}
          </Button>

          {/* The two reports somebody makes after the fact. Under their own
              question rather than in the same row as "voy": they are past
              tense, and one of them is the only thing that can close a case. */}
          <p className="text-muted-foreground mt-0.5 text-[0.65rem] font-medium">
            {WORK_ORDER_LABEL.sectionBeenThere}
          </p>
          <div className="grid grid-cols-2 gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setComposing("helped")}
            >
              {WORK_ORDER_UPDATE_KIND_LABEL.helped}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setComposing("still_needed")}
            >
              {WORK_ORDER_UPDATE_KIND_LABEL.still_needed}
            </Button>
          </div>
          <p className="text-muted-foreground text-[0.65rem] leading-snug">
            {WORK_ORDER_LABEL.updateHint}
          </p>
        </Section>
      )}

      {/* Getting there, forwarding it, and reading what happened. Neither a
          commitment nor a correction — the things you do with a case without
          changing it. */}
      <Section>
        <OrderDirectionsButton order={order} />

        {entryCount > 0 && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleThread}
              aria-expanded={threadOpen}
            >
              <MessageSquare className="size-3.5" aria-hidden />
              {threadOpen
                ? WORK_ORDER_LABEL.attendeesHide
                : WORK_ORDER_LABEL.threadCount(entryCount)}
            </Button>

            {/* What has actually happened, in order. This is what makes
                several people add up to a plan instead of three volquetas on
                the same corner at the same hour — and it is the evidence
                behind a status nobody can now set by hand. */}
            {threadOpen && (
              <ul className="flex flex-col gap-1">
                {updates === null ? (
                  <li className="text-muted-foreground text-[0.65rem]">
                    {WORK_ORDER_LABEL.attendeesLoading}
                  </li>
                ) : updates.length === 0 ? (
                  <li className="text-muted-foreground text-[0.65rem]">
                    {WORK_ORDER_LABEL.attendeesEmpty}
                  </li>
                ) : (
                  updates.map((update) => (
                    <li
                      key={update.id}
                      className="bg-muted/40 rounded border p-1.5 text-[0.7rem] leading-snug"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">
                          {update.name ?? WORK_ORDER_LABEL.anonymous}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] leading-tight font-semibold",
                            WORK_ORDER_UPDATE_KIND_STYLE[update.kind],
                          )}
                        >
                          {WORK_ORDER_UPDATE_KIND_TAG[update.kind]}
                        </span>
                      </div>
                      {update.note && (
                        <p className="text-muted-foreground mt-0.5">
                          {update.note}
                        </p>
                      )}
                      {update.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1"
                          render={<a href={`tel:${update.phone}`} />}
                        >
                          <Phone className="size-3.5" aria-hidden />
                          {update.phone}
                        </Button>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        )}
      </Section>

      {/* "This listing is wrong", in its two forms. Last and quietest on
          purpose: they are the controls a mistap hurts, and "no es un caso
          real" in particular is an accusation about a household. Ghost
          weight is the design saying so without a warning label. */}
      {open && (
        <Section label={WORK_ORDER_LABEL.sectionWrong}>
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3" aria-hidden />
              {WORK_ORDER_LABEL.edit}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setComposing("not_real")}
            >
              {WORK_ORDER_UPDATE_KIND_LABEL.not_real}
            </Button>
          </div>
        </Section>
      )}

      {/* A different audience entirely, so it is boxed rather than stacked:
          a curator reading their own controls should never have to work out
          which of nine buttons are theirs. */}
      {isAdmin && (
        <div className="border-primary/30 bg-muted/30 mt-2 rounded-md border border-dashed p-2">
          <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
            {WORK_ORDER_LABEL.sectionCuration}
          </p>

          {open &&
            (confirmingClose ? (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground text-[0.65rem]">
                  {WORK_ORDER_LABEL.closeConfirm}{" "}
                  {CLOSE_ACTION_LABEL[confirmingClose]}
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
              <div className="mt-1 grid grid-cols-2 gap-1">
                {(["closed_completed", "closed_rejected"] as const).map(
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
            ))}

          <AdminActions
            published={order.published}
            onSetPublished={(published) => setWorkOrderPublished(order.id, published)}
            onDelete={() => deleteWorkOrder(order.id)}
          />
        </div>
      )}
    </>
  );
}

/**
 * One band of the card: a hairline, an optional question, and its controls.
 *
 * The rule is one question per band. A band with no label is one whose
 * controls say what they are ("Cómo llegar", "Compartir") — a heading there
 * would be a word spent naming something already named.
 */
function Section({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t pt-2">
      {label && (
        <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

/** Only the approximate point: the public row carries a block-level
 *  `approx_location`, which is enough to drive to the corner. */
function OrderDirectionsButton({ order }: { order: WorkOrderDTO }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
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

/**
 * The share control, in both the places a card can put it.
 *
 * A thin wrapper over the shared `ShareButton` rather than its own copy of
 * the flow: this file used to carry a second implementation of
 * navigator.share-then-clipboard, and it was the one that crashed on a phone
 * over plain http, because `navigator.clipboard` does not exist outside a
 * secure context. One implementation cannot drift from itself.
 */
function OrderShareButton({
  order,
  className,
}: {
  order: WorkOrderDTO;
  className?: string;
}) {
  return (
    <ShareButton
      path={`/necesidad/${order.id}`}
      title={`${WORK_ORDER_CATEGORY_LABEL[order.category]}${
        order.neighborhood ? ` · ${order.neighborhood}` : ""
      }`}
      text={order.description}
      className={className}
    />
  );
}
