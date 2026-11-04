export type VariantKind = "storage" | "size"; // "size" is reserved for sneakers (Aisle 2)

export type Tier = "Budget" | "Entry" | "Mid-range" | "Upper mid" | "Flagship";

export type Brand = "Apple" | "Samsung";

export interface ColourOption {
  id: string;
  label: string;
  hex: string; // applied to the GLB material named "Body"
}

export interface VariantOption {
  id: string;
  label: string;
  priceDelta: number; // UGX added to basePrice
}

export interface ProductSpecs {
  screen: string;
  battery: string;
  camera: string;
  ram: string;
}

export interface Product {
  id: string; // matches the GLB filename
  brand: Brand;
  name: string;
  tier: Tier;
  basePrice: number; // UGX, integer
  modelUrl: string;
  colours: ColourOption[];
  variantKind: VariantKind;
  variants: VariantOption[];
  specs: ProductSpecs;
  displaySlot: string; // which fixture/slot in the store it sits on
}

export interface CartItem {
  productId: string;
  colourId: string;
  variantId: string;
  qty: number;
  unitPrice: number;
}
