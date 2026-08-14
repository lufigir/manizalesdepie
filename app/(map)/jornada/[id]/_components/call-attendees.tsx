import { Phone, PhoneOff } from "lucide-react";

import type { AttendeeDTO } from "@/data/call/call.dto";
import { JOIN_LABEL } from "@/lib/labels";

/**
 * Who signed up, shown to the one person entitled to see it.
 *
 * This block is the reason creating a jornada asks for an account at all. These
 * numbers were handed over so that one specific organiser could say "nos vemos
 * a las 8, lleva guantes" — not to be published on a map during a looting
 * curfew. The row-level policy on `call_attendance` is what enforces that; this
 * is where the promise is kept in the interface.
 *
 * A signup with no number is still listed. That person is a headcount and the
 * organiser should know they exist and that they cannot be warned.
 */
export function CallAttendees({ attendees }: { attendees: AttendeeDTO[] }) {
  return (
    <section className="border-b p-3">
      <h2 className="text-sm font-semibold">{JOIN_LABEL.attendees}</h2>
      <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
        {JOIN_LABEL.attendeesHint}
      </p>

      {attendees.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          {JOIN_LABEL.attendeesEmpty}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {attendees.map((attendee) => (
            <li key={attendee.id}>
              {attendee.whatsapp ? (
                <a
                  href={`https://wa.me/${attendee.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-accent flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm font-medium"
                >
                  <Phone className="size-3.5 shrink-0" aria-hidden />
                  <span className="tabular-nums">{attendee.whatsapp}</span>
                  {attendee.forTomorrow && (
                    <span className="bg-claimed-surface text-claimed border-claimed/30 ml-auto rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold">
                      {JOIN_LABEL.tomorrowTag}
                    </span>
                  )}
                </a>
              ) : (
                <p className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-sm">
                  <PhoneOff className="size-3.5 shrink-0" aria-hidden />
                  {JOIN_LABEL.noContact}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
