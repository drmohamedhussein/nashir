import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const shell = readFileSync(
  path.resolve(__dirname, "../components/rankpublish/app-dashboard-shell.tsx"),
  "utf8",
);

describe("cloud app mobile navigation", () => {
  it("toggles a drawer instead of hiding the sidebar on small screens", () => {
    expect(shell).toMatch(/aria-expanded=\{navOpen\}/);
    expect(shell).toMatch(/aria-controls="app-nav"/);
    expect(shell).toMatch(/setNavOpen/);
    expect(shell).toMatch(/max-lg:hidden/);
    expect(shell).toMatch(/touch-manipulation/);
    expect(shell).not.toMatch(/\binert=/);
    expect(shell).toMatch(/hasConnectedSite/);
    expect(shell).toMatch(/\/app\/getting-started/);
    expect(shell).not.toMatch(/aside className="hidden w-\[248px\]/);
    expect(shell).not.toMatch(/"flex w-\[248px\]/);
  });
});
