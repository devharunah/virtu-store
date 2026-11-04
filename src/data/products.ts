import type { Product } from "@/types/product";

// Names, specs and prices are placeholders for the demo (see docs/BUILD-PLAN.md).
export const products: Product[] = [
  {
    id: "nova-a1",
    name: "Nova A1",
    tier: "Budget",
    basePrice: 349_000,
    modelUrl: "/models/phones/nova-a1.glb",
    colours: [
      { id: "midnight", label: "Midnight", hex: "#2B3A55" },
      { id: "sand", label: "Sand", hex: "#D8C7A3" },
      { id: "mint", label: "Mint", hex: "#9ED9C3" },
    ],
    variantKind: "storage",
    variants: [
      { id: "64", label: "64 GB", priceDelta: 0 },
      { id: "128", label: "128 GB", priceDelta: 60_000 },
    ],
    specs: { screen: '6.6" HD+ 90 Hz', battery: "5,000 mAh", camera: "13 MP", ram: "4 GB" },
    displaySlot: "table-1",
  },
  {
    id: "nova-a5",
    name: "Nova A5",
    tier: "Entry",
    basePrice: 549_000,
    modelUrl: "/models/phones/nova-a5.glb",
    colours: [
      { id: "forest", label: "Forest", hex: "#3E7C59" },
      { id: "graphite", label: "Graphite", hex: "#3A3A3C" },
      { id: "sky", label: "Sky", hex: "#8EC5E8" },
    ],
    variantKind: "storage",
    variants: [
      { id: "128", label: "128 GB", priceDelta: 0 },
      { id: "256", label: "256 GB", priceDelta: 90_000 },
    ],
    specs: { screen: '6.7" FHD+ 90 Hz', battery: "5,000 mAh", camera: "50 MP + 2 MP", ram: "6 GB" },
    displaySlot: "table-1",
  },
  {
    id: "pulse-x",
    name: "Pulse X",
    tier: "Mid-range",
    basePrice: 899_000,
    modelUrl: "/models/phones/pulse-x.glb",
    colours: [
      { id: "lilac", label: "Lilac", hex: "#C9B8E8" },
      { id: "pearl", label: "Pearl", hex: "#F1EFEA" },
      { id: "ink", label: "Ink", hex: "#22252B" },
    ],
    variantKind: "storage",
    variants: [
      { id: "128", label: "128 GB", priceDelta: 0 },
      { id: "256", label: "256 GB", priceDelta: 120_000 },
    ],
    specs: { screen: '6.6" AMOLED 120 Hz', battery: "5,000 mAh", camera: "64 MP triple", ram: "8 GB" },
    displaySlot: "table-2",
  },
  {
    id: "pulse-x-pro",
    name: "Pulse X Pro",
    tier: "Upper mid",
    basePrice: 1_499_000,
    modelUrl: "/models/phones/pulse-x-pro.glb",
    colours: [
      { id: "sunset", label: "Sunset", hex: "#D9822B" },
      { id: "ocean", label: "Ocean", hex: "#2C6E8F" },
      { id: "onyx", label: "Onyx", hex: "#1F1F1F" },
    ],
    variantKind: "storage",
    variants: [
      { id: "256", label: "256 GB", priceDelta: 0 },
      { id: "512", label: "512 GB", priceDelta: 250_000 },
    ],
    specs: { screen: '6.7" AMOLED 120 Hz', battery: "5,200 mAh", camera: "108 MP triple", ram: "12 GB" },
    displaySlot: "table-2",
  },
  {
    id: "zenith-ultra",
    name: "Zenith Ultra",
    tier: "Flagship",
    basePrice: 3_499_000,
    modelUrl: "/models/phones/zenith-ultra.glb",
    colours: [
      { id: "titanium-black", label: "Titanium Black", hex: "#1C1C1E" },
      { id: "silver", label: "Silver", hex: "#C7C9CC" },
      { id: "desert", label: "Desert", hex: "#BFA27A" },
    ],
    variantKind: "storage",
    variants: [
      { id: "256", label: "256 GB", priceDelta: 0 },
      { id: "512", label: "512 GB", priceDelta: 400_000 },
      { id: "1024", label: "1 TB", priceDelta: 900_000 },
    ],
    specs: { screen: '6.8" LTPO AMOLED 120 Hz', battery: "5,000 mAh", camera: "200 MP + periscope", ram: "16 GB" },
    displaySlot: "podium",
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);
