"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Keeps a half-filled form alive across the trip to Google and back.
 *
 * This is what makes deferred sign-up honest. Asking for the account at the end
 * is only kinder than asking at the door if the work survives; coming back to
 * an empty form after typing everything is worse than having been asked first,
 * and the person does not try again.
 *
 * sessionStorage, not localStorage: the draft belongs to this tab and this
 * sitting. Someone reporting a damaged house on a borrowed phone should not
 * find it waiting for the next person, and a draft that outlives the emergency
 * helps nobody.
 *
 * It never reaches a server. Until the form is published there is no row, so
 * nothing anyone could read.
 */
export function useDraft<T extends Record<string, unknown>>(
  key: string,
  initial: T,
) {
  const [value, setValue] = useState<T>(initial);
  /**
   * Nothing is written until the saved draft has been read back AND applied.
   *
   * This is state, not a ref, and that distinction is the whole bug it fixes.
   * With a ref set synchronously inside the reader effect, the writer effect —
   * which runs in the same commit — already saw "restored" while `value` was
   * still the empty initial state, and promptly saved that over the real draft.
   * As state, both updates batch into one render, so the writer only ever runs
   * once `value` is the restored draft.
   */
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      // Setting state from an effect, deliberately. sessionStorage does not
      // exist while rendering on the server, so restoring cannot happen any
      // earlier without a hydration mismatch: the server has no draft and the
      // client does. This is the external-store case the rule is not aimed at.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setValue((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch {
      // Private browsing, a full quota, or a shape that changed since the
      // draft was written. Losing a draft is a bad day; crashing the report
      // form during an emergency is worse.
    }
    setRestored(true);
    // Reading happens once, on mount, by design.
  }, [key]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // See above.
    }
  }, [key, value, restored]);

  /** Called once the form has been published, so the next report starts clean. */
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // See above.
    }
  }, [key]);

  return { value, setValue, clear } as const;
}
