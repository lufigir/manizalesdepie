import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/data/user/require-user";
import { AUTH_LABEL } from "@/lib/labels";

import { GoogleButton } from "../_components/google-button";
import { safeNext } from "../safe-next";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNext(next);

  // Already signed in: the login screen has nothing to offer, so skip it
  // rather than making someone tap through a second time.
  if (await getCurrentUser()) redirect(target);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {AUTH_LABEL.title}
        </h1>
        <p className="text-muted-foreground text-sm">{AUTH_LABEL.subtitle}</p>
      </div>

      <GoogleButton next={target} />

      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground text-center text-sm underline-offset-4 hover:underline"
      >
        {AUTH_LABEL.back}
      </Link>
    </main>
  );
}
