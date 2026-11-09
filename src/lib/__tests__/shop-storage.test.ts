import { getDemoShop } from "@/data/demo-shops";
import type { ShopConfig } from "../shop-schema";
import { joinShop, listingFromDoc, listingFromShop, splitShop } from "../shop-storage";

const PHOTO = "https://res.cloudinary.com/virtu/image/upload/v1/virtu/a.webp";

const shop: ShopConfig = {
  slug: "pioneer-mall-shop",
  name: "Pioneer Mall Shop",
  location: "Kisekka",
  ownerUid: "u1",
  theme: { wall: "#EFE9DA", accent: "#7A140C", floor: "#D8D1C3" },
  bannerUrl: PHOTO,
  stock: [
    { productId: "galaxy-a17", price: 700_000, photos: [PHOTO] },
    { productId: "iphone-17", price: 3_900_000 },
  ],
  customPhones: [
    {
      id: "c2",
      brand: "Tecno",
      name: "Spark 30",
      price: 550_000,
      storage: [{ label: "128 GB", priceDelta: 0 }],
      colours: [{ label: "Black", hex: "#111111" }],
      photos: [PHOTO],
    },
  ],
};

describe("splitShop", () => {
  it("keeps the shop document small and puts details in phone documents", () => {
    const { doc, phones } = splitShop(shop);
    expect(doc.stock).toEqual([
      { productId: "galaxy-a17", price: 700_000 },
      { productId: "iphone-17", price: 3_900_000 },
    ]);
    expect(doc.customPhones).toEqual([{ id: "c2", name: "Spark 30", price: 550_000 }]);
    expect([...phones.keys()]).toEqual(["galaxy-a17", "c2"]);
    expect(phones.get("galaxy-a17")).toEqual({ photos: [PHOTO] });
    expect(phones.get("c2")).not.toHaveProperty("id");
  });

  it("leaves customPhones out when there are none", () => {
    const { doc } = splitShop({ ...shop, customPhones: [] });
    expect(doc).not.toHaveProperty("customPhones");
  });
});

describe("joinShop", () => {
  const stored = () => {
    const { doc, phones } = splitShop(shop);
    return { doc: { ...doc, updatedAt: "ts" } as Record<string, unknown>, phones };
  };

  it("round-trips a shop", () => {
    const { doc, phones } = stored();
    expect(joinShop(doc, phones)).toEqual(shop);
  });

  it("drops a seller phone whose details are missing, and keeps the shop", () => {
    const { doc, phones } = stored();
    phones.delete("c2");
    expect(joinShop(doc, phones)?.customPhones).toBeUndefined();
  });

  it("ignores photos that aren't Cloudinary images", () => {
    const { doc, phones } = stored();
    phones.set("galaxy-a17", { photos: ["https://evil.example/x.png"] });
    expect(joinShop(doc, phones)?.stock[0]).toEqual({ productId: "galaxy-a17", price: 700_000 });
  });
});

describe("listings", () => {
  it("reads a directory card from the shop document alone", () => {
    expect(listingFromDoc(splitShop(shop).doc)).toEqual({
      slug: "pioneer-mall-shop",
      name: "Pioneer Mall Shop",
      location: "Kisekka",
      theme: shop.theme,
      bannerUrl: PHOTO,
      phones: ["Galaxy A17 5G", "iPhone 17", "Spark 30"],
      fromPrice: 550_000,
    });
  });

  it("matches the card built from a whole shop", () => {
    expect(listingFromShop(shop)).toEqual(listingFromDoc(splitShop(shop).doc));
    const demo = getDemoShop("kikuubo-phone-hub");
    if (!demo) throw new Error("missing");
    expect(listingFromShop(demo)).toEqual(listingFromDoc(splitShop(demo).doc));
  });

  it("refuses a malformed document", () => {
    expect(listingFromDoc({ slug: "x" })).toBeNull();
    expect(
      listingFromDoc({ ...splitShop(shop).doc, bannerUrl: "https://evil.example" }),
    ).toBeNull();
  });
});
