import { describe, expect, it } from "vitest";
import { WIDGET_PROVIDER_GROUPS, WIDGET_REGISTRY, WIDGET_REGISTRY_MAP } from "@/lib/widgets/registry";
import { WIDGET_TYPES, isWidgetType } from "@/lib/widgets/types";

describe("widget registry", () => {
  it("contains one registry item for each widget type", () => {
    const registeredTypes = new Set(WIDGET_REGISTRY.map((item) => item.type));
    expect(registeredTypes.size).toBe(WIDGET_TYPES.length);
    for (const widgetType of WIDGET_TYPES) {
      expect(registeredTypes.has(widgetType)).toBe(true);
      expect(isWidgetType(widgetType)).toBe(true);
    }
  });

  it("registry map points to same entries", () => {
    for (const registryItem of WIDGET_REGISTRY) {
      expect(WIDGET_REGISTRY_MAP[registryItem.type]).toEqual(registryItem);
    }
  });

  it("every widget provider has a provider group", () => {
    const providerGroups = new Set(WIDGET_PROVIDER_GROUPS.map((group) => group.key));
    for (const item of WIDGET_REGISTRY) {
      expect(providerGroups.has(item.provider)).toBe(true);
    }
  });

  it("contains valid positive grid dimensions", () => {
    for (const item of WIDGET_REGISTRY) {
      expect(item.gridWidth === 1 || item.gridWidth === 2).toBe(true);
      expect(item.gridHeight === 1 || item.gridHeight === 2).toBe(true);
    }
  });
});
