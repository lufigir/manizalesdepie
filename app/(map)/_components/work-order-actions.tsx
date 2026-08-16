"use client";

import { useEffect, useState, useTransition } from "react";
import { Move, Pencil, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
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
  RELOCATE_LABEL,
  WORK_ORDER_CATEGORY_ICON,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_LABEL,
  WORK_ORDER_UPDATE_DEFAULT_NOTE,
  WORK_ORDER_UPDATE_KIND_ICON,
  WORK_ORDER_UPDATE_KIND_LABEL,
  WORK_ORDER_UPDATE_PLACEHOLDER,
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { WhatsappIcon } from "./whatsapp-icon";
import { AdminActions } from "./admin-actions";
import { WorkOrderThread } from "./work-order-thread";
import { useWorkspace } from "./workspace-context";

/** The icon for one of the four entry kinds, at the size every button in
 *  this card uses. One place, so the composer heading and the button that
 *  opened it cannot drift apart. */
function UpdateIcon({ kind }: { kind: WorkOrderUpdateKind }) {
  const Icon = WORK_ORDER_UPDATE_KIND_ICON[kind];
  return <Icon className="size-3.5" aria-hidden />;
}

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
  const { isAdmin, userName, startRelocate } = useWorkspace();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Which entry the composer is open for, or null when it is shut. One
  // composer for all four kinds: they ask for the same three things and
  // differ only in the sentence they are making.
  const [composing, setComposing] = useState<WorkOrderUpdateKind | null>(null);
  // Seeded from the session so a signed-in reader is not retyping their own
  // name to say "voy". Still a plain editable field: the entry is signed by
  // whoever is going, which is not always the person holding the phone.
  const [name, setName] = useState(userName ?? "");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [posted, setPosted] = useState<WorkOrderUpdateKind | null>(null);

  /**
   * The case's thread. Fetched as soon as the card mounts, whenever there is
   * anything to fetch.
   *
   * It used to sit behind a "Ver qué ha pasado (3)" button, so the most
   * valuable thing on the card — what people found when they got there — was
   * the one thing a reader had to ask for. The fetch it was avoiding was
   * never per-case anyway: `WorkOrderActions` only renders inside the card of
   * the SELECTED pin, so this is one request for one case the reader has
   * already chosen to open, not one per pin on the map.
   */
  const [updates, setUpdates] = useState<WorkOrderUpdateDTO[] | null>(null);
  /** The entry this reader just wrote, so the thread can point at it. */
  const [ownEntryId, setOwnEntryId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [category, setCategory] = useState<WorkOrderCategory>(order.category);
  const [description, setDescription] = useState(order.description);

  const [confirmingClose, setConfirmingClose] = useState<CloseOutcome | null>(
    null,
  );

  const rollup = workOrderRollup(order);
  const open = rollup !== "done" && rollup !== "dismissed";

  // Entries the counters already know about, before the thread itself has
  // arrived. Reading it off the DTO rather than off `updates` is what lets
  // the heading show a count on first paint instead of appearing late.
  const entryCount = order.attendeeCount + order.helpedCount;

  useEffect(() => {
    if (entryCount === 0) return;

    let cancelled = false;
    listWorkOrderUpdates(order.id)
      .then((rows) => {
        if (!cancelled) setUpdates(rows);
      })
      .catch(() => {
        // Silent: the thread is not the reason this card was opened, and a
        // red error over the contact block would bury the fact that IS.
        // `updates` stays null, which renders as "Cargando…".
      });

    return () => {
      cancelled = true;
    };
  }, [order.id, entryCount]);

  /**
   * Opens the composer with the note already written.
   *
   * The point is that publishing costs one more tap and no thinking: the
   * default says exactly what the button just said, and somebody with more
   * to add types over it. See `WORK_ORDER_UPDATE_DEFAULT_NOTE`.
   */
  function compose(kind: WorkOrderUpdateKind) {
    setError(null);
    setNote(WORK_ORDER_UPDATE_DEFAULT_NOTE[kind]);
    setComposing(kind);
  }

  function submitUpdate(kind: WorkOrderUpdateKind) {
    setError(null);

    // A note is still required by the schema — a counter that moves with no
    // words behind it is not evidence of anything. But an emptied box means
    // "no tengo nada que añadir", so it falls back to the default rather
    // than becoming an error the reader has to solve to finish a tap.
    const trimmedNote = note.trim() || WORK_ORDER_UPDATE_DEFAULT_NOTE[kind];
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
        const rows = await listWorkOrderUpdates(order.id);
        setUpdates(rows);
        setOwnEntryId(rows.at(-1)?.id ?? null);
      } catch (cause) {
        const msg =
          cause instanceof Error ? cause.message : WORK_ORDER_LABEL.failed;
        // Zod v4 serialises issues as a JSON array in .message — a reader
        // should never see that, so fall back to the generic label.
        setError(msg.startsWith("[") ? WORK_ORDER_LABEL.failed : msg);
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
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <UpdateIcon kind={composing} />
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

      {/*
       * Two tabs, not one long scroll.
       *
       * The card used to stack contact, "¿puedes ayudar?", the full thread,
       * "¿algo está mal?" and the curator zone in that order — up to nine
       * controls deep, with the thread (the part that answers "¿qué ha
       * pasado aquí?") buried in the middle of it. Splitting it in two gives
       * each half the whole card: "Detalle" is everything a reader DOES to a
       * case, "Hilo" is everything anyone has SAID about it, and neither has
       * to compete with the other's height on a 20rem popup.
       *
       * `key={order.id}` resets which tab is open when the selection moves
       * to a different pin — otherwise a reader who leaves "Hilo" open on
       * one case would find every case after it opening straight to the
       * thread instead of the ask.
       */}
      <Tabs key={order.id} defaultValue="detail" className="mt-2">
        <TabsList
          variant="underline"
          className="w-[calc(100%+1.5rem)] gap-0 rounded-none bg-accent/40 p-0 text-muted-foreground -mx-3 data-[orientation=horizontal]:py-0"
        >
          <TabsTab
            value="detail"
            className="h-9 flex-1 rounded-none border-0 px-1 text-sm font-semibold data-active:text-primary"
          >
            {WORK_ORDER_LABEL.tabDetail}
          </TabsTab>
          <TabsTab
            value="thread"
            className="h-9 flex-1 rounded-none border-0 px-1 text-sm font-semibold data-active:text-primary"
          >
            {WORK_ORDER_LABEL.threadTitle}
            {entryCount > 0 && (
              <span className="ml-1 text-xs tabular-nums opacity-70">
                {entryCount}
              </span>
            )}
          </TabsTab>
        </TabsList>

        <TabsPanel value="detail" className="flex flex-col">
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
                <div className="mt-1.5 flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    render={<a href={`tel:${order.phone}`} />}
                  >
                    <Phone className="size-3.5" aria-hidden />
                    {order.phone}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    render={
                      <a
                        href={`https://wa.me/57${order.phone}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <WhatsappIcon />
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
            <Button onClick={() => compose("on_the_way")}>
              <UpdateIcon kind="on_the_way" />
              {WORK_ORDER_UPDATE_KIND_LABEL.on_the_way}
            </Button>

            {/* Everything somebody reports AFTER standing in front of the
                case, under one question. Under its own question rather than
                in the same row as "voy": these are past tense, and one of
                them is the only thing that can close a case.

                "Esto no es un caso real" joined them here. It used to sit
                far below under "si algo está mal", away from the other two,
                on the reasoning that it is an accusation about a household
                and should be hard to hit by accident. The reasoning survives
                — it is still the quietest control in this group, ghost
                weight on its own row — but the separation did not: all three
                answer the same question a person asks having just been
                there, and splitting them meant somebody who found an empty
                lot had to hunt for the way to say so. Distance was doing a
                job that weight does better. */}
            <p className="text-muted-foreground mt-0.5 text-[0.65rem] font-medium">
              {WORK_ORDER_LABEL.sectionBeenThere}
            </p>
            <div className="grid grid-cols-2 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => compose("helped")}
              >
                <UpdateIcon kind="helped" />
                {WORK_ORDER_UPDATE_KIND_LABEL.helped}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => compose("still_needed")}
              >
                <UpdateIcon kind="still_needed" />
                {WORK_ORDER_UPDATE_KIND_LABEL.still_needed}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => compose("not_real")}
            >
              <UpdateIcon kind="not_real" />
              {WORK_ORDER_UPDATE_KIND_LABEL.not_real}
            </Button>
            <p className="text-muted-foreground text-[0.65rem] leading-snug">
              {WORK_ORDER_LABEL.updateHint}
            </p>
          </Section>
        )}

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
              {/* "El pin está mal puesto" belongs here rather than beside the
                  directions button: it is the third form of "this listing is
                  wrong", and the most common one — the coordinates on the
                  seeded cases are approximate by AGENTS.md's own admission.
                  No account and no role; see `canRelocate`. */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  startRelocate({
                    id: order.id,
                    kind: "workOrder",
                    longitude: order.longitude,
                    latitude: order.latitude,
                  })
                }
              >
                <Move className="size-3" aria-hidden />
                {RELOCATE_LABEL.action}
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
        </TabsPanel>

        {/* The thread, at full weight and never behind a tap or a scroll
            past nine other controls — a tab of its own is what "Hilo" bought
            over sharing space with everything above.

            Rendered for a closed case too. The thread is the record of how
            it got closed, and it is the only thing left that can be checked
            if somebody thinks it was closed wrongly. */}
        <TabsPanel value="thread" className="mt-2">
          {/* `entryCount === 0` never fires the fetch above, so `updates`
              would otherwise sit at its initial `null` forever — which the
              thread reads as "still loading" rather than "nothing here yet".
              Derived here instead of through the effect, which would trip
              the set-state-in-effect rule for a value already knowable from
              a prop. */}
          <WorkOrderThread
            updates={entryCount === 0 ? [] : updates}
            highlightId={ownEntryId}
          />
        </TabsPanel>
      </Tabs>
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
  /** Printed beside the label, in the same quiet weight. Only the thread uses
   *  it: "3 notas" is what tells a reader there is something worth scrolling
   *  to before they have scrolled to it. */
  count,
  children,
}: {
  label?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t pt-2">
      {label && (
        <p className="text-muted-foreground flex items-baseline gap-1.5 text-[0.65rem] font-semibold tracking-wide uppercase">
          {label}
          {count !== undefined && count > 0 && (
            <span className="font-medium normal-case opacity-70 tabular-nums">
              {WORK_ORDER_LABEL.threadCount(count)}
            </span>
          )}
        </p>
      )}
      {children}
    </div>
  );
}

