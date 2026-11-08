"use client";

import { authErrorMessage, signInWithEmail, signInWithGoogle } from "@/components/shop/use-auth";
import { type FormEvent, useState } from "react";

const input =
  "h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[15px] outline-none focus:border-neutral-900";

/** Sign in or create a seller account: Google, or email and password. */
export function SignInCard() {
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => signInWithEmail(email.trim(), password, mode === "create"));
  };

  return (
    <div className="max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">
        {mode === "create" ? "Create your seller account" : "Sign in to your shop"}
      </h2>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(signInWithGoogle)}
        className="h-11 w-full rounded-full border border-neutral-900 font-medium hover:bg-black/5 disabled:opacity-50"
      >
        Continue with Google
      </button>
      <p className="text-center text-xs uppercase tracking-wide text-neutral-400">or with email</p>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label className="block space-y-1 text-sm font-medium">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || email.trim() === "" || password === ""}
          className="h-11 w-full rounded-full bg-neutral-900 font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {mode === "create" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "create" ? "sign-in" : "create");
          setError(null);
        }}
        className="w-full text-center text-sm text-neutral-600 underline underline-offset-4"
      >
        {mode === "create" ? "I already have an account" : "New here? Create an account"}
      </button>
    </div>
  );
}
