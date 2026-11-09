/**
 * Environment variables, checked at the point of use.
 *
 * Next inlines `NEXT_PUBLIC_*` variables into the browser bundle only where the code names them
 * literally, so callers pass the value in: `requireEnv("NEXT_PUBLIC_X", process.env["NEXT_PUBLIC_X"])`.
 * A dynamic `process.env[name]` lookup here would always be undefined in the browser.
 */

export class MissingEnvError extends Error {
  constructor(readonly variable: string) {
    super(`${variable} is not set. Copy .env.example to .env.local and fill it in.`);
    this.name = "MissingEnvError";
  }
}

export function requireEnv(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") throw new MissingEnvError(name);
  return value;
}
