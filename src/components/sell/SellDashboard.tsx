"use client";

import { signOutUser, useAuth } from "@/components/shop/use-auth";
import { firebaseConfigured } from "@/lib/firebase";
import { ShopEditor } from "./ShopEditor";
import { SignInCard } from "./SignInCard";

function Intro() {
  return (
    <section className="space-y-2 pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4a0c]">
        For phone sellers
      </p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Open your shop in 3D</h1>
      <p className="max-w-xl text-neutral-600">
        Name it, paint it, put your phones on the counters at your prices. You get a link your
        customers can walk into from any phone.
      </p>
    </section>
  );
}

/** The seller dashboard: sign in, then build and save your shop. */
export function SellDashboard() {
  const auth = useAuth();

  if (!firebaseConfigured) {
    return (
      <>
        <Intro />
        <div role="note" className="max-w-xl rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Seller accounts aren&rsquo;t configured</h2>
          <p className="mt-1 text-sm text-neutral-600">
            This copy of VIRTU.STORE has no Firebase project connected. Set the{" "}
            <code className="text-[0.85em]">NEXT_PUBLIC_FIREBASE_*</code> variables from <code className="text-[0.85em]">.env.example</code> to turn on
            seller sign-in (see <code className="text-[0.85em]">docs/FIREBASE-SETUP.md</code>).
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Intro />
      {auth.status === "loading" && <p className="text-sm text-neutral-500">Checking sign-in…</p>}
      {auth.status === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {auth.message}
        </p>
      )}
      {auth.status === "signed-out" && <SignInCard />}
      {auth.status === "signed-in" && (
        <div className="space-y-4">
          <p className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            Signed in as {auth.user.email ?? auth.user.displayName ?? "you"}
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="font-medium text-neutral-900 underline underline-offset-4"
            >
              Sign out
            </button>
          </p>
          <ShopEditor key={auth.user.uid} uid={auth.user.uid} />
        </div>
      )}
    </>
  );
}
