import { getProduct } from "@/data/products";
import type { Product } from "@/types/product";
import { selectionFor, useUiStore } from "../ui-store";

const proMax = getProduct("iphone-17-pro-max") as Product;
const initial = useUiStore.getState();

beforeEach(() => {
  useUiStore.setState(initial, true);
});

describe("selectionFor", () => {
  it("defaults to the first colour and the base storage", () => {
    expect(selectionFor({}, proMax)).toEqual({ colourId: "cosmic-orange", variantId: "256" });
  });

  it("falls back to defaults for ids the product does not have", () => {
    expect(
      selectionFor({ "iphone-17-pro-max": { colourId: "nope", variantId: "" } }, proMax),
    ).toEqual({
      colourId: "cosmic-orange",
      variantId: "256",
    });
  });
});

describe("ui store", () => {
  it("only updates the near phone when it changes", () => {
    const { setNear } = useUiStore.getState();
    setNear("table-1:0", "galaxy-a17", "black");
    const first = useUiStore.getState();
    setNear("table-1:0", "galaxy-a17", "black");
    expect(useUiStore.getState()).toBe(first); // no new state object, so no re-render
    expect(first).toMatchObject({ nearSlotId: "table-1:0", nearColourId: "black" });
  });

  it("opens on the displayed colour, then remembers what the visitor picks", () => {
    const s = useUiStore.getState();
    s.openInspect("iphone-17-pro-max", "deep-blue");
    expect(useUiStore.getState().inspectingId).toBe("iphone-17-pro-max");
    expect(selectionFor(useUiStore.getState().selections, proMax)).toEqual({
      colourId: "deep-blue",
      variantId: "256",
    });

    s.selectVariant(proMax, "1024");
    s.selectColour(proMax, "silver");
    s.closeInspect();
    s.openInspect("iphone-17-pro-max", "cosmic-orange"); // a choice already made wins over the display
    expect(selectionFor(useUiStore.getState().selections, proMax)).toEqual({
      colourId: "silver",
      variantId: "1024",
    });
  });

  it("closes the panel", () => {
    useUiStore.getState().openInspect("galaxy-a17");
    useUiStore.getState().closeInspect();
    expect(useUiStore.getState().inspectingId).toBeNull();
  });
});
