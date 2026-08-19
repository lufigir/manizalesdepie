import "server-only";

type Level = "debug" | "info" | "warn" | "error";

type Fields = Record<string, unknown>;

/** Keys whose values never reach a log line. The address and phone of an
 *  affected person are why a `need` row carries the fields it does; they
 *  must not leak out the side door into stdout. */
const REDACTED = new Set([
  "phone",
  "whatsapp",
  "exact_address",
  "exactAddress",
  "contact_name",
  "contactName",
  "email",
  "authorization",
  "cookie",
  "token",
]);

function redact(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACTED.has(key)) {
      out[key] = "[redacted]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redact(value as Fields);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function emit(level: Level, message: string, fields: Fields = {}) {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...redact(fields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Structured logging. Every line is one JSON object so it stays greppable once
 * it lands in a hosting provider's log drain.
 *
 * Pass a `traceId` through from the request so a single user's path can be
 * reconstructed; `withTrace` binds it once instead of repeating it.
 */
export const log = {
  debug: (message: string, fields?: Fields) => emit("debug", message, fields),
  info: (message: string, fields?: Fields) => emit("info", message, fields),
  warn: (message: string, fields?: Fields) => emit("warn", message, fields),
  error: (message: string, fields?: Fields) => emit("error", message, fields),
};

export function withTrace(traceId: string) {
  return {
    debug: (message: string, fields?: Fields) =>
      emit("debug", message, { ...fields, traceId }),
    info: (message: string, fields?: Fields) =>
      emit("info", message, { ...fields, traceId }),
    warn: (message: string, fields?: Fields) =>
      emit("warn", message, { ...fields, traceId }),
    error: (message: string, fields?: Fields) =>
      emit("error", message, { ...fields, traceId }),
  };
}
