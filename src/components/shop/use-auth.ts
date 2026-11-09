"use client";

import { getFirebase } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { useEffect, useState } from "react";

export type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: User }
  | { status: "error"; message: string };

/** The Firebase user, following sign-in and sign-out. Reports missing config as an error. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { auth } = await getFirebase();
        const { onAuthStateChanged } = await import("firebase/auth");
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (user) =>
          setState(user ? { status: "signed-in", user } : { status: "signed-out" }),
        );
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Sign-in is unavailable",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return state;
}

export async function signInWithGoogle() {
  const { auth } = await getFirebase();
  const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithEmail(email: string, password: string, create: boolean) {
  const { auth } = await getFirebase();
  const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import(
    "firebase/auth"
  );
  await (create ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(
    auth,
    email,
    password,
  );
}

export async function signOutUser() {
  const { auth } = await getFirebase();
  const { signOut } = await import("firebase/auth");
  await signOut(auth);
}

/** Firebase auth errors as sentences a shop owner can act on. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match. Try again or create an account.";
    case "auth/email-already-in-use":
      return "There's already an account with that email. Sign in instead.";
    case "auth/weak-password":
      return "Use a password of at least 6 characters.";
    case "auth/invalid-email":
      return "That doesn't look like an email address.";
    case "auth/popup-closed-by-user":
      return "The Google window was closed before signing in.";
    case "auth/unauthorized-domain":
      return "This site isn't on the Firebase project's authorised domains yet.";
    default:
      return error instanceof Error ? error.message : "Sign-in failed. Please try again.";
  }
}
