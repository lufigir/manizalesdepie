"use client";

import { ACTION_LAYERS, type ActionLayer } from "@/lib/layers";
import { cn } from "@/lib/utils";

/**
 * Picks one action layer, and toggles any number of context layers.
 *
 * The asymmetry is the whole design. Choosing an action is choosing what NOT to
 * look at — the reason to pick "Animales" is to stop seeing debris — so those
 * are exclusive. Context is backdrop and answers a different question at the
 * same time ("where is the nearest hospital while I look at this"), so it
 * stacks freely. Ushahidi ships exactly this rule.
 */
export function LayerControl({
  action,
  onActionChange,
  counts,
}: {
  action: ActionLayer;
  onActionChange: (layer: ActionLayer) => void;
  /** How many points each action layer holds, so an empty one is visible
   *  before it is chosen rather than after. */
  counts: Record<ActionLayer, number>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="pointer-events-auto -mx-1 no-scrollbar flex gap-1.5 overflow-x-auto px-1">
        {(Object.keys(ACTION_LAYERS) as ActionLayer[]).map((layer) => {
          const { label, icon: Icon } = ACTION_LAYERS[layer];
          const active = layer === action;
          const count = counts[layer];

          return (
            <button
              key={layer}
              type="button"
              onClick={() => onActionChange(layer)}
              aria-pressed={active}
              title={ACTION_LAYERS[layer].hint}
              className={cn(
                "focus-visible:ring-ring flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/90 hover:bg-accent",
                // An empty layer is dimmed but never hidden: knowing that
                // nobody has reported animals yet is information.
                !active && count === 0 && "opacity-55",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
