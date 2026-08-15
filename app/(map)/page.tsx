import { redirect } from "next/navigation";

import { DEFAULT_TAB_HREF } from "@/lib/tabs";

/**
 * "/" is not a screen of its own; it is the question "¿qué vengo a hacer?"
 * already answered with the most common reply.
 *
 * A redirect rather than rendering "Ayudar" here: two URLs showing the same
 * thing means two things to keep in step, and a shared link should always name
 * the section it opens.
 */
export default function MapPage() {
  redirect(DEFAULT_TAB_HREF);
}
