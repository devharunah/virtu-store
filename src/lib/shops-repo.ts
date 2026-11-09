import { getFirebase } from "./firebase";
import { type ShopConfig, parseShop } from "./shop-schema";
import { type ShopListing, joinShop, listingFromDoc, splitShop } from "./shop-storage";

/**
 * Seller shops in Firestore:
 *   shops/{slug}               the shop (public read; only its owner writes)
 *   shops/{slug}/phones/{id}   a phone's details or photos (see src/lib/shop-storage.ts)
 *   owners/{uid}               { slug } — one shop per account, and the slug never changes
 * `firestore.rules` enforces the same shape the zod schema checks here.
 */

const SHOPS = "shops";
const PHONES = "phones";
const OWNERS = "owners";
const LIST_LIMIT = 60;

export class SlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`The link /stores/${slug} is taken. Try another shop name or link.`);
    this.name = "SlugTakenError";
  }
}

/** The directory: one read per shop document; phone details aren't needed for a card. */
export async function listShops(): Promise<ShopListing[]> {
  const { db } = await getFirebase();
  const { collection, getDocs, limit, orderBy, query } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, SHOPS), orderBy("updatedAt", "desc"), limit(LIST_LIMIT)),
  );
  return snap.docs.map((d) => listingFromDoc(d.data())).filter((s) => s !== null);
}

/** Ids of the phone documents a shop has now. */
async function phoneDocs(slug: string): Promise<Map<string, unknown>> {
  const { db } = await getFirebase();
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, SHOPS, slug, PHONES));
  return new Map(snap.docs.map((d) => [d.id, d.data()]));
}

/** A whole shop: its document and its phones (two reads). */
export async function getShop(slug: string): Promise<ShopConfig | null> {
  const { db } = await getFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const [snap, phones] = await Promise.all([getDoc(doc(db, SHOPS, slug)), phoneDocs(slug)]);
  return snap.exists() ? joinShop(snap.data(), phones) : null;
}

/** The signed-in seller's shop, or null if they haven't opened one yet. */
export async function getMyShop(uid: string): Promise<ShopConfig | null> {
  const { db } = await getFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const owner = await getDoc(doc(db, OWNERS, uid));
  const slug = owner.exists() ? (owner.data() as { slug?: unknown }).slug : undefined;
  return typeof slug === "string" ? getShop(slug) : null;
}

/** True when nobody else has this slug (the seller's own shop counts as free). */
export async function isSlugFree(slug: string, uid: string): Promise<boolean> {
  const { db } = await getFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, SHOPS, slug));
  return !snap.exists() || (snap.data() as { ownerUid?: unknown }).ownerUid === uid;
}

/**
 * Creates or updates the seller's shop in one transaction, so two sellers can't both claim a
 * slug, then writes its phone documents and removes the ones it no longer has. Validates with
 * the schema first; the rules check again on the server.
 */
export async function saveShop(input: ShopConfig): Promise<ShopConfig> {
  const parsed = parseShop(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid shop");
  const shop = parsed.data;

  const { db } = await getFirebase();
  const { deleteField, doc, runTransaction, serverTimestamp, writeBatch } = await import(
    "firebase/firestore"
  );
  const shopRef = doc(db, SHOPS, shop.slug);
  const ownerRef = doc(db, OWNERS, shop.ownerUid);
  const { doc: stored, phones } = splitShop(shop);

  await runTransaction(db, async (tx) => {
    const [existing, owner] = await Promise.all([tx.get(shopRef), tx.get(ownerRef)]);
    const ownedSlug = owner.exists() ? (owner.data() as { slug?: unknown }).slug : undefined;
    if (typeof ownedSlug === "string" && ownedSlug !== shop.slug) {
      throw new Error(`Your shop's link is /stores/${ownedSlug} and can't be changed.`);
    }
    if (existing.exists() && existing.data()["ownerUid"] !== shop.ownerUid) {
      throw new SlugTakenError(shop.slug);
    }
    if (existing.exists()) {
      // update() merges, so removed optional fields have to be deleted explicitly.
      tx.update(shopRef, {
        ...stored,
        bannerUrl: stored.bannerUrl ?? deleteField(),
        customPhones: stored.customPhones ?? deleteField(),
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(shopRef, { ...stored, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      tx.set(ownerRef, { slug: shop.slug });
    }
  });

  // The rules let only the shop's owner write its phones, so this runs once the shop exists.
  const existing = await phoneDocs(shop.slug);
  const batch = writeBatch(db);
  for (const [id, phone] of phones) {
    batch.set(doc(db, SHOPS, shop.slug, PHONES, id), { ...phone, updatedAt: serverTimestamp() });
  }
  for (const id of existing.keys()) {
    if (!phones.has(id)) batch.delete(doc(db, SHOPS, shop.slug, PHONES, id));
  }
  await batch.commit();
  return shop;
}
