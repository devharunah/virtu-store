import { Showroom } from "@/components/shop/Showroom";
import { VIRTU_SHOP } from "@/data/demo-shops";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Showroom · VIRTU.STORE" };

export default function StorePage() {
  return <Showroom shop={VIRTU_SHOP} />;
}
