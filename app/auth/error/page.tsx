import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Error de ingreso" };

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {AUTH_LABEL.errorTitle}
      </h1>
      <p className="text-muted-foreground text-sm">{AUTH_LABEL.errorBody}</p>
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
      >
        {AUTH_LABEL.back}
      </Link>
    </main>
  );
}
