import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { requireEnv } from "./env";

/**
 * Firebase (Auth + Firestore) for seller shops. Loaded lazily: the showroom never pulls the SDK
 * in, only `/sell` and Firestore-backed shop pages do.
 *
 * The web config is public by design (it ships to every browser); what protects the data is
 * `firestore.rules`. See docs/FIREBASE-SETUP.md.
 */

// Each variable is named literally so Next can inline it into the browser bundle.
const RAW = {
  apiKey: process.env["NEXT_PUBLIC_FIREBASE_API_KEY"],
  authDomain: process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  projectId: process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  appId: process.env["NEXT_PUBLIC_FIREBASE_APP_ID"],
};

/** True when all four Firebase variables are set (CI and fresh clones run without them). */
export const firebaseConfigured = Object.values(RAW).every((v) => v !== undefined && v !== "");

function config(): FirebaseOptions {
  return {
    apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY", RAW.apiKey),
    authDomain: requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", RAW.authDomain),
    projectId: requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", RAW.projectId),
    appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID", RAW.appId),
  };
}

/**
 * Optional: "true" talks to the local Firebase emulators (`pnpm emulators`) instead of a real
 * project. Use it with a `demo-` project id, which needs no Firebase account.
 */
const USE_EMULATORS = process.env["NEXT_PUBLIC_FIREBASE_EMULATORS"] === "true";

async function connectEmulators(auth: Auth, db: Firestore) {
  const [{ connectAuthEmulator }, { connectFirestoreEmulator }] = await Promise.all([
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let handles: Promise<FirebaseHandles> | null = null;

/** The app, Auth and Firestore, initialised once. Throws `MissingEnvError` without config. */
export function getFirebase(): Promise<FirebaseHandles> {
  handles ??= (async () => {
    const options = config();
    const [{ getApp, getApps, initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore"),
    ]);
    const fresh = getApps().length === 0;
    const app = fresh ? initializeApp(options) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    if (fresh && USE_EMULATORS) await connectEmulators(auth, db);
    return { app, auth, db };
  })();
  // A failed init (missing env) must not be cached forever.
  handles.catch(() => {
    handles = null;
  });
  return handles;
}
