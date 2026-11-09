export type VariantKind = "storage" | "size"; // "size" is reserved for sneakers (Aisle 2)

export type Tier =
  | "Budget"
  | "Entry"
  | "Mid-range"
  | "Upper mid"
  | "Flagship"
  /** A phone a seller added themselves (not in the catalogue). */
  | "Seller's phone";

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
  id: string; // matches the GLB filename; seller-added phones are "custom-<id>"
  /** A catalogue `Brand`, or whatever a seller typed for a phone they added. */
  brand: Brand | (string & {});
  name: string;
  tier: Tier;
  basePrice: number; // UGX, integer
  modelUrl: string;
  colours: ColourOption[];
  variantKind: VariantKind;
  variants: VariantOption[];
  /** Catalogue phones only; a seller's own phone has none. */
  specs?: ProductSpecs;
  displaySlot: string; // which fixture/slot in the store it sits on
  /** Real photos a seller uploaded (Cloudinary URLs). */
  photos?: string[];
  /** True for a phone a seller added themselves; it shows as the unbranded generic model. */
  custom?: boolean;
}

export interface CartItem {
  productId: string;
  colourId: string;
  variantId: string;
  qty: number;
  unitPrice: number;
}
