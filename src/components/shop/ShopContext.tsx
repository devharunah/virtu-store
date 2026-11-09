"use client";

import { VIRTU_SHOP } from "@/data/demo-shops";
import type { ShopConfig } from "@/lib/shop-schema";
import { createContext, use } from "react";

const ShopContext = createContext<ShopConfig>(VIRTU_SHOP);

/** The shop being browsed, for the HTML overlay (product panel, prompts). Defaults to VIRTU. */
export const ShopProvider = ShopContext.Provider;

export const useShop = () => use(ShopContext);
