"use client";

import {
  type CheckoutErrors,
  type CheckoutForm,
  INITIAL_CHECKOUT_FORM,
  type PaymentMethod,
  deliveryEstimate,
  formatUgPhone,
  hasErrors,
  makeOrderId,
  normalizeUgPhone,
  paymentLabel,
  validateCheckout,
  withSubmittedText,
} from "@/lib/checkout";
import { formatUGX } from "@/lib/format-ugx";
import { type CartTotals, type DeliveryArea, cartTotals } from "@/lib/pricing";
import { type PricedCartLine, useCart, useCartHydrated, useCartLines } from "@/store/cart-store";
import { CircleCheck, LoaderCircle, ShoppingBag, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CheckoutFields from "./CheckoutFields";
import OrderSummary from "./OrderSummary";

/** How long the fake "approve on your phone" prompt waits before the payment "succeeds". */
export const APPROVAL_DELAY_MS = 2_500;

interface PlacedOrder {
  id: string;
  fullName: string;
  /** E.164, e.g. +256772123456 */
  phone: string;
  area: DeliveryArea;
  payment: PaymentMethod;
  lines: PricedCartLine[];
  totals: CartTotals;
}

type Step =
  | { kind: "form" }
  | { kind: "approving"; order: PlacedOrder }
  | { kind: "success"; order: PlacedOrder };

const FIELD_ORDER: (keyof CheckoutForm)[] = ["fullName", "phone", "area", "notes", "payment"];

export default function CheckoutFlow() {
  const hydrated = useCartHydrated();
  const lines = useCartLines();
  const clear = useCart((s) => s.clear);
  const [form, setForm] = useState<CheckoutForm>(INITIAL_CHECKOUT_FORM);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [step, setStep] = useState<Step>({ kind: "form" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  const area = form.area === "" ? undefined : form.area;
  const totals = cartTotals(lines, area);

  // The order is placed: empty the bag and show the receipt.
  const complete = (order: PlacedOrder) => {
    clear();
    setStep({ kind: "success", order });
  };

  useEffect(() => {
    if (step.kind !== "approving") return;
    const { order } = step;
    const timer = window.setTimeout(() => {
      clear();
      setStep({ kind: "success", order });
    }, APPROVAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [step, clear]);

  // Each new step announces itself by taking focus.
  useEffect(() => {
    if (step.kind !== "form") headingRef.current?.focus();
  }, [step.kind]);

  const onChange = (patch: Partial<CheckoutForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    // Clear an error as soon as its field changes, so stale messages don't linger.
    // A payment/phone network mismatch is reported on the phone field, so a payment change clears it.
    const changed = new Set<string>(Object.keys(patch));
    if (changed.has("payment")) changed.add("phone");
    setErrors(
      (current) =>
        Object.fromEntries(
          Object.entries(current).filter(([field]) => !changed.has(field)),
        ) as CheckoutErrors,
    );
  };

  const onSubmit = (formElement: HTMLFormElement) => {
    // Read the text fields from the DOM too: autofill can fill them without an input event.
    const submitted = withSubmittedText(form, new FormData(formElement));
    setForm(submitted);
    const found = validateCheckout(submitted);
    setErrors(found);
    const phone = normalizeUgPhone(submitted.phone);
    if (hasErrors(found) || phone === null || submitted.area === "" || submitted.payment === "") {
      const first = FIELD_ORDER.find((field) => found[field] !== undefined);
      if (first === "payment") {
        document.querySelector<HTMLInputElement>('input[name="payment"]')?.focus();
      } else if (first !== undefined) {
        document.getElementById(first)?.focus();
      }
      return;
    }
    const order: PlacedOrder = {
      id: makeOrderId(),
      fullName: submitted.fullName.trim(),
      phone,
      area: submitted.area,
      payment: submitted.payment,
      lines,
      totals,
    };
    if (order.payment === "cash") complete(order);
    else setStep({ kind: "approving", order });
  };

  if (step.kind === "approving") {
    const { order } = step;
    return (
      <section
        aria-live="polite"
        className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4 rounded-2xl border border-black/10 bg-white/70 p-8 text-center"
      >
        <Smartphone aria-hidden="true" className="size-10 text-[#8a4a0c]" strokeWidth={1.5} />
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Approve the payment prompt on your phone
        </h1>
        <p className="text-neutral-600">
          We sent a {paymentLabel(order.payment)} request for{" "}
          <strong className="text-neutral-900">{formatUGX(order.totals.total)}</strong> to{" "}
          {formatUgPhone(order.phone)}. Enter your PIN to approve it.
        </p>
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-neutral-500" />
        <p className="text-sm text-neutral-500">Waiting for approval… (demo: no money moves)</p>
        <button
          type="button"
          onClick={() => setStep({ kind: "form" })}
          className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
        >
          Cancel
        </button>
      </section>
    );
  }

  if (step.kind === "success") {
    const { order } = step;
    return (
      <section className="mx-auto mt-8 max-w-xl space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleCheck aria-hidden="true" className="size-12 text-green-700" strokeWidth={1.5} />
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
            Order placed. Webale, {order.fullName.split(" ")[0]}!
          </h1>
          <p className="text-neutral-600">
            Order number{" "}
            <strong className="font-mono text-neutral-900" data-testid="order-number">
              {order.id}
            </strong>
          </p>
        </div>
        <p className="rounded-2xl bg-white/70 p-4 text-center ring-1 ring-black/10">
          A boda rider will call you on {formatUgPhone(order.phone)}. Estimated delivery:{" "}
          {deliveryEstimate(order.area)}.
          {order.payment === "cash" && (
            <> Have {formatUGX(order.totals.total)} ready for the rider.</>
          )}
        </p>
        <OrderSummary
          title="Your order"
          lines={order.lines}
          totals={order.totals}
          deliveryNote={order.area}
        />
        <p className="text-center text-sm text-neutral-500">
          Your bag has been cleared. Paid with {paymentLabel(order.payment)} (demo).
        </p>
        <div className="flex justify-center">
          <Link
            href="/store"
            className="inline-flex h-12 items-center rounded-full bg-neutral-900 px-6 font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Back to the showroom
          </Link>
        </div>
      </section>
    );
  }

  if (!hydrated) {
    return (
      <p className="mt-16 text-center text-neutral-500" aria-live="polite">
        Loading your bag…
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="mx-auto mt-16 flex max-w-md flex-col items-center gap-4 text-center">
        <ShoppingBag aria-hidden="true" className="size-12 text-neutral-400" strokeWidth={1.5} />
        <h1 className="text-2xl font-semibold">Your bag is empty</h1>
        <p className="text-neutral-600">
          Walk through the showroom, pick up a phone you like and add it to your bag.
        </p>
        <Link
          href="/store"
          className="inline-flex h-12 items-center rounded-full bg-neutral-900 px-6 font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Go to the showroom
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div>
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Checkout</h1>
        <CheckoutFields
          form={form}
          errors={errors}
          onChange={onChange}
          onSubmit={onSubmit}
          total={formatUGX(totals.total)}
        />
      </div>
      <div className="lg:sticky lg:top-6">
        <OrderSummary
          lines={lines}
          totals={totals}
          deliveryNote={area ?? "Kampala, choose an area"}
        />
      </div>
    </div>
  );
}
