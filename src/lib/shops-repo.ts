import { getFirebase } from "./firebase";
import { type ShopConfig, parseShop } from "./shop-schema";

/**
 * Seller shops in Firestore:
 *   shops/{slug}   the shop (public read; only its owner writes)
 *   owners/{uid}   { slug } — one shop per account, and the slug never changes
 * `firestore.rules` enforces the same shape the zod schema checks here.
 */

const SHOPS = "shops";
const OWNERS = "owners";
const LIST_LIMIT = 60;

export class SlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`The link /stores/${slug} is taken. Try another shop name or link.`);
    this.name = "SlugTakenError";
  }
}

/** The plain shop fields, without Firestore timestamps (and dropping anything unexpected). */
const toConfig = (data: unknown): ShopConfig | null => {
  const parsed = parseShop(data);
  return parsed.success ? parsed.data : null;
};

export async function listShops(): Promise<ShopConfig[]> {
  const { db } = await getFirebase();
  const { collection, getDocs, limit, orderBy, query } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, SHOPS), orderBy("updatedAt", "desc"), limit(LIST_LIMIT)),
  );
  return snap.docs.map((d) => toConfig(d.data())).filter((s): s is ShopConfig => s !== null);
}

export async function getShop(slug: string): Promise<ShopConfig | null> {
  const { db } = await getFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, SHOPS, slug));
  return snap.exists() ? toConfig(snap.data()) : null;
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
 * slug. Validates with the schema first; the rules check again on the server.
 */
export async function saveShop(input: ShopConfig): Promise<ShopConfig> {
  const parsed = parseShop(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid shop");
  const shop = parsed.data;

  const { db } = await getFirebase();
  const { deleteField, doc, runTransaction, serverTimestamp } = await import("firebase/firestore");
  const shopRef = doc(db, SHOPS, shop.slug);
  const ownerRef = doc(db, OWNERS, shop.ownerUid);

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
      // update() merges, so a removed banner has to be deleted explicitly.
      tx.update(shopRef, {
        ...shop,
        bannerUrl: shop.bannerUrl ?? deleteField(),
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(shopRef, { ...shop, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      tx.set(ownerRef, { slug: shop.slug });
    }
  });
  return shop;
}
