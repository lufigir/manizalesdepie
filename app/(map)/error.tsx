"use client";

import { useEffect } from "react";

/**
 * If the map cannot load, the one thing that must still work is the way in for
 * someone who needs help. A blank error screen during an emergency is a dead
 * end; the WhatsApp line is not.
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
        Puede ser tu conexión o una falla nuestra. Si necesitas ayuda ahora, no
        esperes al mapa: escríbenos.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Reintentar
        </button>
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_CURATOR_WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Escribir por WhatsApp
        </a>
      </div>
    </div>
  );
}
