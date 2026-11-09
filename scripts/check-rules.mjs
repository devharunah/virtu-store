// Attacks firestore.rules on the local emulator and reports what got through.
// Run `pnpm emulators` in one terminal, then `node scripts/check-rules.mjs` in another.
// It uses throwaway accounts on the offline demo-virtu project; nothing touches a real project.
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const run = Date.now().toString(36);

function client(name) {
  const app = initializeApp({ apiKey: "demo-key", projectId: "demo-virtu", appId: "demo" }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return { auth, db };
}

const shop = (slug, ownerUid, extra = {}) => ({
  slug,
  name: "Rules Test Shop",
  location: "Kampala",
  ownerUid,
  theme: { wall: "#EFE9DA", accent: "#0F6E74", floor: "#D8D1C3" },
  stock: [{ productId: "galaxy-a17", price: 700000 }],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

/** Claims a shop the way the app does: shop + owners doc in one batch. */
async function claim(db, slug, uid, extra) {
  const batch = writeBatch(db);
  batch.set(doc(db, "shops", slug), shop(slug, uid, extra));
  batch.set(doc(db, "owners", uid), { slug });
  await batch.commit();
}

const results = [];
async function expectOutcome(label, shouldPass, fn) {
  let passed;
  try {
    await fn();
    passed = true;
  } catch (e) {
    passed = false;
    if (!String(e?.code ?? e).includes("permission-denied")) {
      results.push({ label, ok: false, note: `unexpected error: ${e?.message ?? e}` });
      return;
    }
  }
  results.push({ label, ok: passed === shouldPass, note: passed ? "allowed" : "denied" });
}

const alice = client("alice");
const bob = client("bob");
const anon = client("anon");
const carol = client("carol");
const a = await createUserWithEmailAndPassword(
  alice.auth,
  `alice-${run}@virtu.test`,
  "rules-test-1",
);
const b = await createUserWithEmailAndPassword(bob.auth, `bob-${run}@virtu.test`, "rules-test-1");
const c = await createUserWithEmailAndPassword(
  carol.auth,
  `carol-${run}@virtu.test`,
  "rules-test-1",
);
const aliceSlug = `alice-${run}`;

await expectOutcome("alice opens her shop", true, () => claim(alice.db, aliceSlug, a.user.uid));
await expectOutcome("anyone can read a shop", true, () => getDoc(doc(anon.db, "shops", aliceSlug)));
await expectOutcome("alice edits her prices", true, () =>
  updateDoc(doc(alice.db, "shops", aliceSlug), {
    stock: [{ productId: "galaxy-a17", price: 650000 }],
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("alice can't open a second shop", false, () =>
  setDoc(doc(alice.db, "shops", `${aliceSlug}-2`), shop(`${aliceSlug}-2`, a.user.uid)),
);
await expectOutcome("alice can't move her owners record", false, () =>
  setDoc(doc(alice.db, "owners", a.user.uid), { slug: "elsewhere" }),
);
await expectOutcome("bob can't edit alice's shop", false, () =>
  updateDoc(doc(bob.db, "shops", aliceSlug), { name: "Hijacked", updatedAt: serverTimestamp() }),
);
await expectOutcome("bob can't take over alice's shop", false, () =>
  updateDoc(doc(bob.db, "shops", aliceSlug), {
    ownerUid: b.user.uid,
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("alice can't give her shop away", false, () =>
  updateDoc(doc(alice.db, "shops", aliceSlug), {
    ownerUid: b.user.uid,
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("bob can't read alice's owners record", false, () =>
  getDoc(doc(bob.db, "owners", a.user.uid)),
);
await expectOutcome("bob can't open a shop in alice's name", false, () =>
  claim(bob.db, `bob-${run}`, a.user.uid),
);
await expectOutcome("signed-out visitors can't open shops", false, () =>
  setDoc(doc(anon.db, "shops", `anon-${run}`), shop(`anon-${run}`, "nobody")),
);
await expectOutcome("a price below the floor is refused", false, () =>
  claim(bob.db, `cheap-${run}`, b.user.uid, { stock: [{ productId: "galaxy-a17", price: 1 }] }),
);
await expectOutcome("an unknown phone is refused", false, () =>
  claim(bob.db, `fake-${run}`, b.user.uid, { stock: [{ productId: "nokia", price: 100000 }] }),
);
await expectOutcome("extra fields are refused", false, () =>
  claim(bob.db, `extra-${run}`, b.user.uid, { verified: true }),
);
await expectOutcome("a bad colour is refused", false, () =>
  claim(bob.db, `colour-${run}`, b.user.uid, {
    theme: { wall: "red", accent: "#0F6E74", floor: "#D8D1C3" },
  }),
);
await expectOutcome("a Cloudinary banner is accepted", true, () =>
  updateDoc(doc(alice.db, "shops", aliceSlug), {
    bannerUrl: "https://res.cloudinary.com/virtu/image/upload/v1/virtu/shops/banner.webp",
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("a banner from another site is refused", false, () =>
  updateDoc(doc(alice.db, "shops", aliceSlug), {
    bannerUrl: "https://evil.example/tracker.png",
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("a banner that isn't a string is refused", false, () =>
  claim(bob.db, `banner-${run}`, b.user.uid, { bannerUrl: { url: "x" } }),
);
const PHOTO = "https://res.cloudinary.com/virtu/image/upload/v1/virtu/shops/p.webp";
const CATALOGUE = [
  "galaxy-a17",
  "galaxy-a56",
  "iphone-17",
  "galaxy-s25-ultra",
  "iphone-17-pro-max",
];
const carolSlug = `carol-${run}`;
const phoneRef = (db, id, slug = carolSlug) => doc(db, "shops", slug, "phones", id);
const ownPhone = (extra = {}) => ({
  name: "N".repeat(40),
  brand: "B".repeat(20),
  price: 550000,
  storage: [
    { label: "128 GB", priceDelta: 0 },
    { label: "256 GB", priceDelta: 80000 },
    { label: "512 GB", priceDelta: 5000000 },
  ],
  colours: ["#111111", "#222222", "#333333", "#444444"].map((hex) => ({
    label: "C".repeat(20),
    hex,
  })),
  photos: Array(5).fill(PHOTO),
  updatedAt: serverTimestamp(),
  ...extra,
});

// The biggest documents must stay inside Firestore's 1,000-expression rules budget.
await expectOutcome("the biggest allowed shop is accepted", true, () =>
  claim(carol.db, carolSlug, c.user.uid, {
    name: "M".repeat(40),
    location: "L".repeat(40),
    bannerUrl: PHOTO,
    stock: CATALOGUE.map((productId) => ({ productId, price: 900000 })),
    customPhones: ["c1", "c2", "c3", "c4"].map((id) => ({
      id,
      name: "N".repeat(40),
      price: 550000,
    })),
  }),
);
await expectOutcome("the biggest own phone is accepted", true, () =>
  setDoc(phoneRef(carol.db, "c4"), ownPhone()),
);
await expectOutcome("five photos of a catalogue phone are accepted", true, () =>
  setDoc(phoneRef(carol.db, "iphone-17"), {
    photos: Array(5).fill(PHOTO),
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("anyone can read a shop's phones", true, () => getDoc(phoneRef(anon.db, "c4")));
await expectOutcome("bob can't add a phone to carol's shop", false, () =>
  setDoc(phoneRef(bob.db, "c1"), ownPhone()),
);
await expectOutcome("bob can't delete carol's phone", false, async () => {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(phoneRef(bob.db, "c4"));
});
await expectOutcome("a fifth own phone (c5) is refused", false, () =>
  setDoc(phoneRef(carol.db, "c5"), ownPhone()),
);
await expectOutcome("photos of an unknown phone are refused", false, () =>
  setDoc(phoneRef(carol.db, "nokia"), { photos: [PHOTO], updatedAt: serverTimestamp() }),
);
await expectOutcome("an own phone with a typo price is refused", false, () =>
  setDoc(phoneRef(carol.db, "c1"), ownPhone({ price: 5 })),
);
await expectOutcome("an own phone with a foreign photo is refused", false, () =>
  setDoc(phoneRef(carol.db, "c1"), ownPhone({ photos: ["https://evil.example/x.png"] })),
);
await expectOutcome("six photos are refused", false, () =>
  setDoc(phoneRef(carol.db, "iphone-17"), {
    photos: Array(6).fill(PHOTO),
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("extra fields on an own phone are refused", false, () =>
  setDoc(phoneRef(carol.db, "c1"), ownPhone({ verified: true })),
);
await expectOutcome("a negative storage step is refused", false, () =>
  setDoc(
    phoneRef(carol.db, "c1"),
    ownPhone({ storage: [{ label: "128 GB", priceDelta: -100000 }] }),
  ),
);
await expectOutcome("four storage options are refused", false, () =>
  setDoc(
    phoneRef(carol.db, "c1"),
    ownPhone({ storage: Array(4).fill({ label: "128 GB", priceDelta: 0 }) }),
  ),
);
await expectOutcome("carol removes her own phone", true, async () => {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(phoneRef(carol.db, "c4"));
});
await expectOutcome("a shop of only the seller's own phones is accepted", true, () =>
  updateDoc(doc(alice.db, "shops", aliceSlug), {
    stock: [],
    customPhones: [{ id: "c1", name: "Spark 30", price: 550000 }],
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("a shop with no phones at all is refused", false, () =>
  updateDoc(doc(alice.db, "shops", aliceSlug), {
    stock: [],
    customPhones: [],
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("a fifth phone summary is refused", false, () =>
  updateDoc(doc(alice.db, "shops", aliceSlug), {
    customPhones: ["c1", "c2", "c3", "c4", "c5"].map((id) => ({
      id,
      name: "Spark",
      price: 550000,
    })),
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("photos in the shop document are refused", false, () =>
  updateDoc(doc(alice.db, "shops", aliceSlug), {
    stock: [{ productId: "galaxy-a17", price: 700000, photos: [PHOTO] }],
    updatedAt: serverTimestamp(),
  }),
);
await expectOutcome("bob can't claim alice's slug", false, () =>
  claim(bob.db, aliceSlug, b.user.uid),
);
await expectOutcome("bob opens his own shop", true, () =>
  runTransaction(bob.db, async (tx) => {
    tx.set(doc(bob.db, "shops", `bob-${run}`), shop(`bob-${run}`, b.user.uid));
    tx.set(doc(bob.db, "owners", b.user.uid), { slug: `bob-${run}` });
  }),
);
await expectOutcome("nobody can delete a shop", false, async () => {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(alice.db, "shops", aliceSlug));
});

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label} (${r.note})`);
}
console.log(`\n${results.length - failed}/${results.length} rule checks behaved as expected`);
process.exit(failed === 0 ? 0 : 1);
