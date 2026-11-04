"use client";

import {
  type CheckoutErrors,
  type CheckoutForm,
  MAX_NOTES_LENGTH,
  PAYMENT_METHODS,
  networkFor,
  normalizeUgPhone,
} from "@/lib/checkout";
import { formatUGX } from "@/lib/format-ugx";
import { DELIVERY_AREAS, type DeliveryArea, deliveryFeeFor } from "@/lib/pricing";
import type { FormEvent } from "react";

interface CheckoutFieldsProps {
  form: CheckoutForm;
  errors: CheckoutErrors;
  onChange: (patch: Partial<CheckoutForm>) => void;
  onSubmit: () => void;
  total: string;
}

const inputClass =
  "mt-1 block h-12 w-full rounded-xl border bg-white px-3 text-base outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";

const borderFor = (error: string | undefined) =>
  error === undefined ? "border-black/15" : "border-red-600";

const NETWORK_LABEL = { mtn: "MTN number", airtel: "Airtel number", other: null } as const;

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

export default function CheckoutFields({
  form,
  errors,
  onChange,
  onSubmit,
  total,
}: CheckoutFieldsProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  const network =
    normalizeUgPhone(form.phone) === null ? null : NETWORK_LABEL[networkFor(form.phone)];
  const described = (field: keyof CheckoutForm) =>
    errors[field] === undefined
      ? {}
      : { "aria-describedby": `${field}-error`, "aria-invalid": true };

  return (
    <form noValidate onSubmit={submit} className="space-y-5" aria-label="Delivery and payment">
      <div>
        <label htmlFor="fullName" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          value={form.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          className={`${inputClass} ${borderFor(errors.fullName)}`}
          {...described("fullName")}
        />
        <FieldError id="fullName-error" message={errors.fullName} />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0772 123456"
          value={form.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          className={`${inputClass} ${borderFor(errors.phone)}`}
          {...described("phone")}
        />
        {network !== null && errors.phone === undefined && (
          <p className="mt-1 text-sm text-neutral-600">{network}</p>
        )}
        <FieldError id="phone-error" message={errors.phone} />
      </div>

      <div>
        <label htmlFor="area" className="text-sm font-medium">
          Delivery area
        </label>
        <select
          id="area"
          name="area"
          value={form.area}
          onChange={(e) => onChange({ area: e.target.value as DeliveryArea | "" })}
          className={`${inputClass} ${borderFor(errors.area)}`}
          {...described("area")}
        >
          <option value="">Choose an area</option>
          {DELIVERY_AREAS.map((area) => (
            <option key={area} value={area}>
              {area} · {formatUGX(deliveryFeeFor(area))}
            </option>
          ))}
        </select>
        <FieldError id="area-error" message={errors.area} />
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium">
          Landmark or address notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={MAX_NOTES_LENGTH}
          placeholder="e.g. Opposite Shell Kisementi, blue gate"
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className={`${inputClass} h-auto py-2 ${borderFor(errors.notes)}`}
          {...described("notes")}
        />
        <FieldError id="notes-error" message={errors.notes} />
      </div>

      <fieldset {...described("payment")}>
        <legend className="text-sm font-medium">Payment method</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {PAYMENT_METHODS.map((method) => (
            <label
              key={method.id}
              className={`flex cursor-pointer flex-col rounded-xl border bg-white p-3 has-checked:border-neutral-900 has-checked:ring-2 has-checked:ring-neutral-900/10 ${borderFor(errors.payment)}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="payment"
                  value={method.id}
                  checked={form.payment === method.id}
                  onChange={() => onChange({ payment: method.id })}
                  className="size-4 accent-neutral-900"
                />
                <span className="font-medium">{method.label}</span>
              </span>
              <span className="mt-1 text-xs text-neutral-600">{method.hint}</span>
            </label>
          ))}
        </div>
        <FieldError id="payment-error" message={errors.payment} />
      </fieldset>

      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-full bg-neutral-900 font-medium text-white transition-colors hover:bg-neutral-700"
      >
        {form.payment === "cash" ? `Place order · ${total}` : `Pay ${total}`}
      </button>
    </form>
  );
}
