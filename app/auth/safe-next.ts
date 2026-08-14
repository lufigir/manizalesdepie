/**
 * Where to land after signing in.
 *
 * `next` arrives from the query string, so it is attacker-controlled: a crafted
 * link like `/auth/login?next=https://evil.example` would otherwise turn our
 * own callback into an open redirect that borrows this site's credibility. In
 * an emergency people click whatever lands in the WhatsApp group, which is
 * exactly the audience such a link is written for.
 *
 * Only a same-site absolute path survives. `//host` is rejected too: browsers
 * read it as protocol-relative and leave the site.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}
