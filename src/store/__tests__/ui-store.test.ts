import { getProduct } from "@/data/products";
import type { Product } from "@/types/product";
import { selectionFor, useUiStore } from "../ui-store";

const zenith = getProduct("zenith-ultra") as Product;
const initial = useUiStore.getState();

beforeEach(() => {
  useUiStore.setState(initial, true);
});

describe("selectionFor", () => {
  it("defaults to the first colour and the base storage", () => {
    expect(selectionFor({}, zenith)).toEqual({ colourId: "titanium-black", variantId: "256" });
  });

  it("falls back to defaults for ids the product does not have", () => {
    expect(selectionFor({ "zenith-ultra": { colourId: "nope", variantId: "" } }, zenith)).toEqual({
      colourId: "titanium-black",
      variantId: "256",
    });
  });
});

describe("ui store", () => {
  it("only updates the near phone when it changes", () => {
    const { setNear } = useUiStore.getState();
    setNear("table-1:0", "nova-a1", "midnight");
    const first = useUiStore.getState();
    setNear("table-1:0", "nova-a1", "midnight");
    expect(useUiStore.getState()).toBe(first); // no new state object, so no re-render
    expect(first).toMatchObject({ nearSlotId: "table-1:0", nearColourId: "midnight" });
  });

  it("opens on the displayed colour, then remembers what the visitor picks", () => {
    const s = useUiStore.getState();
    s.openInspect("zenith-ultra", "silver");
    expect(useUiStore.getState().inspectingId).toBe("zenith-ultra");
    expect(selectionFor(useUiStore.getState().selections, zenith)).toEqual({
      colourId: "silver",
      variantId: "256",
    });

    s.selectVariant(zenith, "1024");
    s.selectColour(zenith, "desert");
    s.closeInspect();
    s.openInspect("zenith-ultra", "titanium-black"); // a choice already made wins over the display
    expect(selectionFor(useUiStore.getState().selections, zenith)).toEqual({
      colourId: "desert",
      variantId: "1024",
    });
  });

  it("closes the panel", () => {
    useUiStore.getState().openInspect("nova-a1");
    useUiStore.getState().closeInspect();
    expect(useUiStore.getState().inspectingId).toBeNull();
  });
});
