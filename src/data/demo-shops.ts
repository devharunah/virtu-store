import type { ShopConfig } from "@/lib/shop-schema";
import { products } from "./products";
import { DEFAULT_THEME, THEMES } from "./themes";

/**
 * Shops that ship with the app, so the directory and every e2e test work without Firebase.
 * Shop names are fictional; prices are indicative.
 */
const theme = (id: string) => {
  const t = THEMES.find((p) => p.id === id);
  if (!t) throw new Error(`Unknown theme "${id}"`);
  return { wall: t.wall, accent: t.accent, floor: t.floor };
};

/** The original showroom: every phone at catalogue price. `/store` opens this one. */
export const VIRTU_SHOP: ShopConfig = {
  slug: "virtu",
  name: "VIRTU.STORE",
  location: "Kampala arcade",
  ownerUid: "demo",
  theme: DEFAULT_THEME,
  stock: products.map((p) => ({ productId: p.id, price: p.basePrice })),
};

export const DEMO_SHOPS: readonly ShopConfig[] = [
  VIRTU_SHOP,
  {
    slug: "kikuubo-phone-hub",
    name: "Kikuubo Phone Hub",
    location: "Kikuubo",
    ownerUid: "demo",
    theme: theme("sunset-orange"),
    stock: [
      { productId: "galaxy-s25-ultra", price: 4_550_000 },
      { productId: "galaxy-a56", price: 1_290_000 },
      { productId: "galaxy-a17", price: 650_000 },
    ],
  },
  {
    slug: "wandegeya-iworld",
    name: "Wandegeya iWorld",
    location: "Wandegeya",
    ownerUid: "demo",
    theme: theme("midnight"),
    stock: [
      { productId: "iphone-17-pro-max", price: 6_350_000 },
      { productId: "iphone-17", price: 3_950_000 },
    ],
    // A phone the shop added itself (fictional brand): it shows as the generic display model.
    customPhones: [
      {
        id: "c1",
        brand: "Kabira",
        name: "K1 Lite",
        price: 480_000,
        storage: [
          { label: "64 GB", priceDelta: 0 },
          { label: "128 GB", priceDelta: 60_000 },
        ],
        colours: [
          { label: "Lake Blue", hex: "#2F6FA8" },
          { label: "Graphite", hex: "#2A2C30" },
        ],
        photos: [],
      },
    ],
  },
];

export const getDemoShop = (slug: string) => DEMO_SHOPS.find((s) => s.slug === slug);
