import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Esta página no existe</h1>
      <p className="text-muted-foreground text-sm">
        Puede que el enlace esté viejo. Todo lo que hay está en el mapa.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold"
      >
        Ir al mapa
      </Link>
    </div>
  );
}
