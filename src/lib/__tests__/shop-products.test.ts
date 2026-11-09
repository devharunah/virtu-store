import { getProduct } from "@/data/products";
import { shopFromPrice, shopUnitPrice } from "../shop-pricing";
import {
  GENERIC_PHONE_URL,
  customProduct,
  resolveShopProduct,
  shopProducts,
} from "../shop-products";
import type { ShopConfig } from "../shop-schema";

const PHOTO = "https://res.cloudinary.com/virtu/image/upload/v1/virtu/a.webp";

const shop: ShopConfig = {
  slug: "pioneer-mall-shop",
  name: "Pioneer Mall Shop",
  location: "Kisekka",
  ownerUid: "u1",
  theme: { wall: "#EFE9DA", accent: "#7A140C", floor: "#D8D1C3" },
  stock: [{ productId: "galaxy-a17", price: 700_000, photos: [PHOTO] }],
  customPhones: [
    {
      id: "c1",
      brand: "Tecno",
      name: "Spark 30",
      price: 550_000,
      storage: [
        { label: "128 GB", priceDelta: 0 },
        { label: "256 GB", priceDelta: 80_000 },
      ],
      colours: [{ label: "Orbit Black", hex: "#111111" }],
      photos: [PHOTO],
    },
  ],
};

describe("customProduct", () => {
  it("is the generic model in the seller's colours and storage", () => {
    const phone = shop.customPhones?.[0];
    if (!phone) throw new Error("missing");
    expect(customProduct(phone)).toMatchObject({
      id: "custom-c1",
      brand: "Tecno",
      name: "Spark 30",
      basePrice: 550_000,
      modelUrl: GENERIC_PHONE_URL,
      colours: [{ id: "c0", label: "Orbit Black", hex: "#111111" }],
      variants: [
        { id: "s0", label: "128 GB", priceDelta: 0 },
        { id: "s1", label: "256 GB", priceDelta: 80_000 },
      ],
      photos: [PHOTO],
      custom: true,
    });
  });
});

describe("shopProducts / resolveShopProduct", () => {
  it("lists catalogue phones first, then the seller's own", () => {
    expect(shopProducts(shop).map((p) => p.id)).toEqual(["galaxy-a17", "custom-c1"]);
  });

  it("adds the shop's photos to a catalogue phone", () => {
    expect(resolveShopProduct(shop, "galaxy-a17")?.photos).toEqual([PHOTO]);
    expect(getProduct("galaxy-a17")?.photos).toBeUndefined();
  });

  it("finds a seller's phone and nothing for an unknown one", () => {
    expect(resolveShopProduct(shop, "custom-c1")?.name).toBe("Spark 30");
    expect(resolveShopProduct(shop, "custom-c9")).toBeUndefined();
  });
});

describe("pricing a seller's phone", () => {
  it("uses the seller's price and storage steps", () => {
    const phone = resolveShopProduct(shop, "custom-c1");
    if (!phone) throw new Error("missing");
    expect(shopUnitPrice(shop, phone, "s1")).toBe(630_000);
  });

  it("counts the seller's phones in the from price", () => {
    expect(shopFromPrice(shop)).toBe(550_000);
  });
});
