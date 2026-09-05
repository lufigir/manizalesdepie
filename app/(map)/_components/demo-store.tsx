"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { NeedDTO, NeedUpdateDTO } from "@/data/need/need.dto";
import { deriveNeedState } from "@/data/need/need.policy";
import type { ServiceDTO } from "@/data/service/service.dto";
import type { SiteDTO } from "@/data/site/site.dto";

/**
 * What the reader did during this visit.
 *
 * The live version wrote to Postgres and everyone saw it. This one has
 * nowhere to write, so the answer has to be either "the forms are disabled"
 * or "what you do is yours" — and a portfolio piece whose report flow cannot
 * be tried is a screenshot with extra steps. So the writes are real, the
 * validation is real, the authorization is real, and the result lands here:
 * a layer over the server's fixtures, held in memory for one visitor.
 *
 * It lives in `app/(map)/layout.tsx`, above every route that draws the map,
 * so a new report survives walking from `/` into `/necesidad/[id]` and back.
 * It does not survive a reload, deliberately — that is what "Reiniciar la
 * demo" does on purpose and what the reader gets for free if they ever want
 * the map back the way it shipped.
 *
 * Why not `localStorage`: nothing here is worth the confusion of a page that
 * greets somebody on Tuesday with a case they invented on Monday, and mixing
 * persisted client state into a server-rendered list is how a map ends up
 * disagreeing with itself between the first paint and the second.
 *
 * Why not a store on the server: Vercel answers consecutive requests from
 * different instances, so "remembered" would mean "remembered about half the
 * time", which reads as a bug rather than as a demo.
 */

type Family = "sites" | "needs" | "services" | "animals";

type Created = {
  sites: SiteDTO[];
  needs: NeedDTO[];
  services: ServiceDTO[];
  animals: AnimalDTO[];
};

const EMPTY: Created = { sites: [], needs: [], services: [], animals: [] };

type Draft = {
  created: Created;
  /** Field-level corrections, by entity id — what every mutation that is not
   *  a creation returns. Applied over whatever the server sent. */
  patches: Record<string, Record<string, unknown>>;
  /** Entities and thread entries a curator deleted. One set for both: an id
   *  is an id, and nothing here is ever un-deleted except by a reset. */
  removed: string[];
  /** Entries added to a case's book, by case id. */
  entries: Record<string, NeedUpdateDTO[]>;
};

const EMPTY_DRAFT: Draft = { created: EMPTY, patches: {}, removed: [], entries: {} };

type DemoStore = {
  /** The server's rows with this visit's work folded in. Every list in the
   *  app goes through it, so nothing has to remember to look in two places. */
  merge: <T extends { id: string }>(family: Family, rows: T[]) => T[];
  add: (family: Family, entity: SiteDTO | NeedDTO | ServiceDTO | AnimalDTO) => void;
  patch: (id: string, fields: Record<string, unknown>) => void;
  remove: (id: string) => void;
  /** Records an entry somebody just wrote on a case, and recomputes the
   *  case's state from its whole book — the browser's copy of what the
   *  `sync_need_state` trigger did. `thread` is every entry that existed
   *  before this one. */
  addNeedEntry: (
    need: NeedDTO,
    entry: NeedUpdateDTO,
    thread: NeedUpdateDTO[],
  ) => void;
  /** This visit's entries on a case, to be shown after the server's. */
  entriesFor: (needId: string) => NeedUpdateDTO[];
  isRemoved: (id: string) => boolean;
  /** Whether anything at all has been done, so the reset button can say so. */
  touched: boolean;
  reset: () => void;
};

const DemoContext = createContext<DemoStore | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const merge = useCallback(
    <T extends { id: string }>(family: Family, rows: T[]): T[] => {
      const created = draft.created[family] as unknown as T[];

      return [...created, ...rows]
        .filter((row) => !draft.removed.includes(row.id))
        .map((row) => {
          const patch = draft.patches[row.id];
          return patch ? ({ ...row, ...patch } as T) : row;
        });
    },
    [draft],
  );

  const add = useCallback(
    (family: Family, entity: SiteDTO | NeedDTO | ServiceDTO | AnimalDTO) =>
      setDraft((previous) => ({
        ...previous,
        created: {
          ...previous.created,
          [family]: [entity, ...previous.created[family]],
        } as Created,
      })),
    [],
  );

  const patch = useCallback(
    (id: string, fields: Record<string, unknown>) =>
      setDraft((previous) => ({
        ...previous,
        patches: {
          ...previous.patches,
          [id]: { ...previous.patches[id], ...fields },
        },
      })),
    [],
  );

  const remove = useCallback(
    (id: string) =>
      setDraft((previous) => ({
        ...previous,
        removed: [...previous.removed, id],
      })),
    [],
  );

  const addNeedEntry = useCallback(
    (need: NeedDTO, entry: NeedUpdateDTO, thread: NeedUpdateDTO[]) =>
      setDraft((previous) => {
        const book = [...thread, entry];

        // A curator's verdict outranks the tally and is never undone by a
        // later entry — the freeze `deriveNeedState` documents. Anything else
        // is derived fresh from the whole book.
        const closed =
          need.status === "closed_completed" || need.status === "closed_rejected"
            ? need.status
            : null;

        return {
          ...previous,
          entries: {
            ...previous.entries,
            [need.id]: [...(previous.entries[need.id] ?? []), entry],
          },
          patches: {
            ...previous.patches,
            [need.id]: {
              ...previous.patches[need.id],
              ...deriveNeedState(book, closed, need.createdAt),
            },
          },
        };
      }),
    [],
  );

  const entriesFor = useCallback(
    (needId: string) =>
      (draft.entries[needId] ?? []).filter(
        (entry) => !draft.removed.includes(entry.id),
      ),
    [draft],
  );

  const isRemoved = useCallback(
    (id: string) => draft.removed.includes(id),
    [draft],
  );

  const reset = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const store = useMemo<DemoStore>(
    () => ({
      merge,
      add,
      patch,
      remove,
      addNeedEntry,
      entriesFor,
      isRemoved,
      touched:
        draft.removed.length > 0 ||
        Object.keys(draft.patches).length > 0 ||
        draft.created.sites.length > 0 ||
        draft.created.needs.length > 0 ||
        draft.created.services.length > 0 ||
        draft.created.animals.length > 0,
      reset,
    }),
    [merge, add, patch, remove, addNeedEntry, entriesFor, isRemoved, draft, reset],
  );

  return <DemoContext value={store}>{children}</DemoContext>;
}

/**
 * The store, from anywhere under the map.
 *
 * Throws rather than degrading when the provider is missing: a component that
 * silently stopped recording what the reader did would look like it worked
 * and lose every report.
 */
export function useDemo(): DemoStore {
  const store = useContext(DemoContext);
  if (!store) throw new Error("useDemo fuera de DemoProvider");
  return store;
}
