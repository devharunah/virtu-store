import { formatUGX } from "@/lib/format-ugx";
import type { CartTotals } from "@/lib/pricing";
import type { PricedCartLine } from "@/store/cart-store";

interface OrderSummaryProps {
  lines: readonly PricedCartLine[];
  totals: CartTotals;
  /** Shown next to the delivery fee, e.g. the chosen area. */
  deliveryNote?: string;
  title?: string;
}

export default function OrderSummary({
  lines,
  totals,
  deliveryNote,
  title = "Order summary",
}: OrderSummaryProps) {
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-black/10 bg-white/70 p-4 sm:p-6"
      data-testid="order-summary"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 divide-y divide-black/10">
        {lines.map((line) => (
          <li key={line.key} className="flex items-center gap-3 py-3">
            <span
              aria-hidden="true"
              className="size-8 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: line.colour.hex }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {line.product.name} <span className="text-neutral-500">× {line.qty}</span>
              </p>
              <p className="text-sm text-neutral-600">
                {line.colour.label} · {line.variant.label}
              </p>
            </div>
            <p className="shrink-0 font-medium">{formatUGX(line.lineTotal)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-2 border-t border-black/10 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-600">Subtotal</dt>
          <dd>{formatUGX(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-600">
            Delivery{deliveryNote === undefined ? "" : ` · ${deliveryNote}`}
          </dt>
          <dd>{formatUGX(totals.delivery)}</dd>
        </div>
        <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd data-testid="order-total">{formatUGX(totals.total)}</dd>
        </div>
      </dl>
    </section>
  );
}
