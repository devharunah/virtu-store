import { type DeliveryArea, isDeliveryArea, isInsideKampala } from "@/lib/pricing";

export type PaymentMethod = "mtn-momo" | "airtel-money" | "cash";

export const PAYMENT_METHODS: readonly { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "mtn-momo", label: "MTN MoMo", hint: "Approve a prompt on your MTN line" },
  { id: "airtel-money", label: "Airtel Money", hint: "Approve a prompt on your Airtel line" },
  { id: "cash", label: "Cash on delivery", hint: "Pay the rider when your phone arrives" },
];

export const paymentLabel = (method: PaymentMethod) =>
  PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method;

export const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  PAYMENT_METHODS.some((m) => m.id === value);

export type Network = "mtn" | "airtel" | "other";

const MTN_PREFIXES = ["76", "77", "78", "79"];
const AIRTEL_PREFIXES = ["70", "74", "75"];

/**
 * Normalises a Ugandan mobile number to E.164 (`+256772123456`), or returns null.
 * Accepts `0772 123456`, `+256 772 123456`, `256772123456` and `772123456`, with
 * spaces, dashes, dots or brackets anywhere. The 9 national digits must start with 7.
 */
export function normalizeUgPhone(input: string): string | null {
  const compact = input.trim().replace(/[\s\-.()]/g, "");
  const match = /^(?:\+256|256|0)?(\d{9})$/.exec(compact);
  const national = match?.[1];
  if (national === undefined || !national.startsWith("7")) return null;
  return `+256${national}`;
}

/** The mobile network for a number in any accepted format; "other" if unknown or invalid. */
export function networkFor(phone: string): Network {
  const normalized = normalizeUgPhone(phone);
  if (normalized === null) return "other";
  const prefix = normalized.slice(4, 6);
  if (MTN_PREFIXES.includes(prefix)) return "mtn";
  if (AIRTEL_PREFIXES.includes(prefix)) return "airtel";
  return "other";
}

/** `+256772123456` -> `+256 772 123456`. Anything else comes back unchanged. */
export function formatUgPhone(phone: string): string {
  const normalized = normalizeUgPhone(phone);
  if (normalized === null) return phone;
  return `+256 ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
}

export interface CheckoutForm {
  fullName: string;
  phone: string;
  /** "" until the shopper picks one. */
  area: DeliveryArea | "";
  notes: string;
  /** "" until the shopper picks one. */
  payment: PaymentMethod | "";
}

export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

export const EMPTY_CHECKOUT_FORM: CheckoutForm = {
  fullName: "",
  phone: "",
  area: "",
  notes: "",
  payment: "",
};

export const MAX_NOTES_LENGTH = 200;

/** Field errors for the checkout form. An empty object means the form is valid. */
export function validateCheckout(form: CheckoutForm): CheckoutErrors {
  const errors: CheckoutErrors = {};

  const name = form.fullName.trim();
  if (name.length === 0) errors.fullName = "Enter your full name.";
  else if (name.length < 2) errors.fullName = "Enter your full name, as the rider should ask for.";
  else if (name.length > 80) errors.fullName = "Keep your name under 80 characters.";

  const phone = normalizeUgPhone(form.phone);
  if (form.phone.trim().length === 0) {
    errors.phone = "Enter the phone number the rider should call.";
  } else if (phone === null) {
    errors.phone = "Enter a Ugandan mobile number, like 0772 123456.";
  }

  if (!isDeliveryArea(form.area)) errors.area = "Choose a delivery area.";

  const notes = form.notes.trim();
  if (notes.length === 0) {
    errors.notes = "Add a landmark so the rider can find you, e.g. opposite Shell Kisementi.";
  } else if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Keep delivery notes under ${MAX_NOTES_LENGTH} characters.`;
  }

  if (!isPaymentMethod(form.payment)) {
    errors.payment = "Choose how you'd like to pay.";
  } else if (phone !== null && errors.phone === undefined) {
    const network = networkFor(phone);
    if (form.payment === "mtn-momo" && network !== "mtn") {
      errors.phone =
        "MTN MoMo needs an MTN number (076, 077, 078 or 079). Use Airtel Money for an Airtel number, or pay cash on delivery.";
    } else if (form.payment === "airtel-money" && network !== "airtel") {
      errors.phone =
        "Airtel Money needs an Airtel number (070, 074 or 075). Use MTN MoMo for an MTN number, or pay cash on delivery.";
    }
  }

  return errors;
}

export const hasErrors = (errors: CheckoutErrors) => Object.keys(errors).length > 0;

/** When the boda should arrive, for the success screen. */
export const deliveryEstimate = (area: DeliveryArea) =>
  isInsideKampala(area) ? "today, within 2–4 hours" : "1–2 days";

// No 0/O or 1/I, so an order number read over the phone is never ambiguous.
const ORDER_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** `VIRTU-7K3F9Q`. Deterministic for a given `random` source. */
export function makeOrderId(random: () => number = Math.random): string {
  let id = "";
  for (let i = 0; i < 6; i++) {
    const index = Math.min(
      ORDER_ID_ALPHABET.length - 1,
      Math.floor(random() * ORDER_ID_ALPHABET.length),
    );
    id += ORDER_ID_ALPHABET.charAt(index);
  }
  return `VIRTU-${id}`;
}
