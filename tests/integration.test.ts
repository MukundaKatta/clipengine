import { describe, it, expect } from "vitest";
import { Clipengine } from "../src/core.js";

describe("Clipengine integration", () => {
  it("handles concurrent ops", async () => {
    const c = new Clipengine();
    await Promise.all([c.process({a:1}), c.process({b:2}), c.process({c:3})]);
    expect(c.getStats().ops).toBe(3);
  });
  it("returns service name", async () => {
    const c = new Clipengine();
    const r = await c.process();
    expect(r.service).toBe("clipengine");
  });
  it("handles 100 ops", async () => {
    const c = new Clipengine();
    for (let i = 0; i < 100; i++) await c.process({i});
    expect(c.getStats().ops).toBe(100);
  });
});
