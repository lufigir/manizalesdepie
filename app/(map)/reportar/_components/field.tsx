/**
 * One labelled field, shared by every report form.
 *
 * Four forms each used to define their own local `Field`, and the required
 * ones announced it in prose ("Obligatorio: …") inside the label hint. That
 * copy drifted, and a hint has two jobs it cannot do at once — say what the
 * field is FOR and how required it is. The asterisk now says the latter on
 * every form, identically, and a hint keeps the former.
 *
 * `required` rides on the `<label>` rather than being baked into the label
 * string, so the marker is the palette's alert colour (it reads as "needed"
 * without a word) and the Spanish copy in `lib/labels.ts` stays plain text.
 */
export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  /** A line under the control explaining what it is FOR. Never "required" —
   *  the asterisk already says that. */
  hint?: string;
  /** Renders the asterisk that marks the field as obligatory. */
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">
        {label}
        {required && <RequiredMark />}
      </span>
      {children}
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
    </label>
  );
}

/** The required asterisk. `aria-hidden`: the control's own `required`
 *  attribute already tells assistive technology, and the mark is decoration. */
export function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      {" *"}
    </span>
  );
}