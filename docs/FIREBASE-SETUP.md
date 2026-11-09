# Firebase setup: seller shops

Seller accounts and shops use Firebase Authentication and Cloud Firestore on the free Spark plan.
Without Firebase the app still runs: `/stores` lists the three featured demo shops, and `/sell`
explains that seller accounts aren't configured. That is how CI runs.

## What lives where

| Collection | Document | Who can read | Who can write |
|---|---|---|---|
| `shops` | `{slug}`: name, location, ownerUid, theme, optional bannerUrl, stock, timestamps | everyone | its owner (create, update); nobody deletes |
| `owners` | `{uid}`: `{ slug }` | that user | that user, once, together with their shop |

- One shop per account.
- A shop's link (`/stores/{slug}`) never changes once opened.
- `firestore.rules` enforces the same shape as `src/lib/shop-schema.ts`: known phones only, whole
  UGX between 50,000 and 20,000,000, `#RRGGBB` colours, 2–40 character names, image URLs on
  Cloudinary only, and no extra fields.
- A Jest test keeps the rules' phone list, price range and image-URL pattern in step with the app.
- Images (banners, phone photos) are stored on Cloudinary, not Firebase: see
  `docs/CLOUDINARY-SETUP.md`.

The web config below ships to every browser by design. **The rules are what protect the data**,
so deploy them before sharing the link.

## Connect a real project

1. Go to <https://console.firebase.google.com>, choose **Add project**, and keep the free Spark
   plan. Analytics is optional.
2. Turn on sign-in under **Build → Authentication → Sign-in method**:
   - **Google**: enable it and choose a support email.
   - **Email/Password**: enable it.
3. Create the database under **Build → Firestore Database → Create database**. Production mode is
   fine, since the rules come next. Pick a location close to Uganda, such as `europe-west1`
   (Belgium), and note that it can't be changed later.
4. Deploy the rules. Either:
   - paste `firestore.rules` into **Firestore → Rules** and click **Publish**, or
   - run `firebase login` once, then
     `firebase deploy --only firestore:rules --project <your-project-id>`.
5. Register the web app under **Project settings → General → Your apps → Web (`</>`)**. Copy the
   values from the config into `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
6. In Vercel, add the same four variables to the project for both Production and Preview, then
   redeploy.
7. Under **Authentication → Settings → Authorized domains**, add your Vercel domain (e.g.
   `virtu-store.vercel.app`). `localhost` is there already. Google sign-in fails with
   `auth/unauthorized-domain` until this is done.

Then sign in at `/sell`, build a shop, press **Open my shop**, and open the link in another browser.

## Work offline with the emulators (no account)

Java 11+ and the Firebase CLI (`npm i -g firebase-tools`) are needed.

```bash
pnpm emulators
```

This runs Auth on `127.0.0.1:9099` and Firestore on `127.0.0.1:8080` for the offline project
`demo-virtu`, enforcing `firestore.rules`. Point the dev server at it with an
`.env.development.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-virtu.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-virtu
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
NEXT_PUBLIC_FIREBASE_EMULATORS=true
```

- Create any test seller at `/sell` with **New here? Create an account**, for example
  `seller@virtu.test` / `virtu-demo-123`. Emulator data is wiped when the emulators stop.
- Google sign-in opens the emulator's fake account picker.
- With the emulators running, `pnpm rules:check` attacks the rules: a second account editing,
  taking over or claiming someone else's shop, bad prices, unknown phones, extra fields, bad
  colours and deletes. It prints PASS or FAIL for each.

## Cost on the Spark plan

- Reads: the directory reads up to 60 shops per visit, and a shop page reads one.
- Writes: only sellers write, when they save.
- The free daily quota (50k reads, 20k writes) covers a demo with plenty of room.
- Authentication with Google and email is free.
