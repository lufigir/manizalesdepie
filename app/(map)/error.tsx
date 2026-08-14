"use client";

import { useEffect } from "react";

/**
 * A blank error screen during an emergency is a dead end, so this one says what
 * happened and offers the only action left.
 *
 * There is no WhatsApp line here any more: contact is per-point now, carried by
 * whoever published each pin, so there is no single number to fall back to when
 * the map itself is what failed.
 */
export default function MapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold text-balance">
        No pudimos cargar el mapa
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Puede ser tu conexión o una falla nuestra. Vuelve a intentarlo.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
