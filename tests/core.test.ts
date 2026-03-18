import { describe, it, expect } from "vitest";
import { Clipengine } from "../src/core.js";
describe("Clipengine", () => {
  it("init", () => { expect(new Clipengine().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Clipengine(); await c.process(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Clipengine(); await c.process(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
