/** The phones are real products with real logos: keep it clear that this is a demo shop. */
export function TrademarkNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-neutral-500 ${className}`}>
      iPhone and Apple are trademarks of Apple Inc. Samsung and Galaxy are trademarks of Samsung
      Electronics Co., Ltd. VIRTU.STORE is a demo shop, not affiliated with or endorsed by either
      company. Prices are indicative.
    </p>
  );
}
