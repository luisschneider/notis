import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
  it("merges classes with tailwind conflict resolution", () => {
    expect(cn("px-2", "px-4", "font-semibold")).toBe("px-4 font-semibold");
  });
});
