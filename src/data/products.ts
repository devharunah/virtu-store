import type { Product } from "@/types/product";

/**
 * The phones on sale. Prices are indicative Kampala retail prices in UGX (Nov 2026) for a demo:
 * Galaxy S25 Ultra and A56 come from a Feb 2026 Uganda round-up; the iPhone 17 Pro Max has no
 * reliable local price yet, so it is an estimate. See docs/BUILD-PLAN.md.
 * iPhone and Apple are trademarks of Apple Inc.; Samsung and Galaxy of Samsung Electronics.
 */
export const products: Product[] = [
  {
    id: "galaxy-a17",
    brand: "Samsung",
    name: "Galaxy A17 5G",
    tier: "Entry",
    basePrice: 720_000,
    modelUrl: "/models/phones/galaxy-a17.glb",
    colours: [
      { id: "black", label: "Black", hex: "#1C1D20" },
      { id: "blue", label: "Blue", hex: "#5D7FA8" },
      { id: "gray", label: "Gray", hex: "#8E9092" },
    ],
    variantKind: "storage",
    variants: [
      { id: "128", label: "128 GB", priceDelta: 0 },
      { id: "256", label: "256 GB", priceDelta: 120_000 },
    ],
    specs: {
      screen: '6.7" Super AMOLED 90 Hz',
      battery: "5,000 mAh",
      camera: "50 MP triple",
      ram: "4 GB",
    },
    displaySlot: "counter-left",
  },
  {
    id: "galaxy-a56",
    brand: "Samsung",
    name: "Galaxy A56 5G",
    tier: "Mid-range",
    basePrice: 1_390_000,
    modelUrl: "/models/phones/galaxy-a56.glb",
    colours: [
      { id: "awesome-graphite", label: "Awesome Graphite", hex: "#3B3D40" },
      { id: "awesome-lightgray", label: "Awesome Lightgray", hex: "#D9DADC" },
      { id: "awesome-olive", label: "Awesome Olive", hex: "#8C8F6F" },
      { id: "awesome-pink", label: "Awesome Pink", hex: "#E7C5CB" },
    ],
    variantKind: "storage",
    variants: [
      { id: "128", label: "128 GB", priceDelta: 0 },
      { id: "256", label: "256 GB", priceDelta: 180_000 },
    ],
    specs: {
      screen: '6.7" Super AMOLED 120 Hz',
      battery: "5,000 mAh",
      camera: "50 MP triple",
      ram: "8 GB",
    },
    displaySlot: "counter-left",
  },
  {
    id: "iphone-17",
    brand: "Apple",
    name: "iPhone 17",
    tier: "Upper mid",
    basePrice: 4_300_000,
    modelUrl: "/models/phones/iphone-17.glb",
    colours: [
      { id: "black", label: "Black", hex: "#1E1F22" },
      { id: "white", label: "White", hex: "#F2F1EE" },
      { id: "mist-blue", label: "Mist Blue", hex: "#A8C3D8" },
      { id: "sage", label: "Sage", hex: "#A9B8A0" },
      { id: "lavender", label: "Lavender", hex: "#CDBFE0" },
    ],
    variantKind: "storage",
    variants: [
      { id: "256", label: "256 GB", priceDelta: 0 },
      { id: "512", label: "512 GB", priceDelta: 900_000 },
    ],
    specs: {
      screen: '6.3" Super Retina XDR 120 Hz',
      battery: "All-day battery",
      camera: "48 MP dual Fusion",
      ram: "8 GB",
    },
    displaySlot: "counter-back",
  },
  {
    id: "galaxy-s25-ultra",
    brand: "Samsung",
    name: "Galaxy S25 Ultra",
    tier: "Flagship",
    basePrice: 4_950_000,
    modelUrl: "/models/phones/galaxy-s25-ultra.glb",
    colours: [
      { id: "titanium-silverblue", label: "Titanium Silverblue", hex: "#A7B3C0" },
      { id: "titanium-black", label: "Titanium Black", hex: "#2B2C2E" },
      { id: "titanium-gray", label: "Titanium Gray", hex: "#8C8B88" },
      { id: "titanium-whitesilver", label: "Titanium Whitesilver", hex: "#E3E3E1" },
    ],
    variantKind: "storage",
    variants: [
      { id: "256", label: "256 GB", priceDelta: 0 },
      { id: "512", label: "512 GB", priceDelta: 700_000 },
      { id: "1024", label: "1 TB", priceDelta: 1_600_000 },
    ],
    specs: {
      screen: '6.9" Dynamic AMOLED 2X 120 Hz',
      battery: "5,000 mAh",
      camera: "200 MP quad, 5x zoom",
      ram: "12 GB",
    },
    displaySlot: "counter-back",
  },
  {
    id: "iphone-17-pro-max",
    brand: "Apple",
    name: "iPhone 17 Pro Max",
    tier: "Flagship",
    basePrice: 6_200_000,
    modelUrl: "/models/phones/iphone-17-pro-max.glb",
    colours: [
      { id: "cosmic-orange", label: "Cosmic Orange", hex: "#E8732C" },
      { id: "deep-blue", label: "Deep Blue", hex: "#2C3A57" },
      { id: "silver", label: "Silver", hex: "#E3E4E6" },
    ],
    variantKind: "storage",
    variants: [
      { id: "256", label: "256 GB", priceDelta: 0 },
      { id: "512", label: "512 GB", priceDelta: 900_000 },
      { id: "1024", label: "1 TB", priceDelta: 1_900_000 },
      { id: "2048", label: "2 TB", priceDelta: 3_900_000 },
    ],
    specs: {
      screen: '6.9" Super Retina XDR, ProMotion',
      battery: "Longest iPhone battery life",
      camera: "48 MP Pro Fusion triple, 8x zoom",
      ram: "12 GB",
    },
    displaySlot: "hero-stand",
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);
