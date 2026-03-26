import { randomUUID } from "node:crypto";

type FixtureKind = "widget" | "reading" | "connected";

const fixtureStore: Record<FixtureKind, Set<string>> = {
  widget: new Set<string>(),
  reading: new Set<string>(),
  connected: new Set<string>(),
};

export function randomEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

export function randomPassword(): string {
  return `Notis!${Math.floor(Math.random() * 1_000_000_000)}Ab`;
}

export function randomUsername(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`.slice(0, 30);
}

export function addFixtureIds(kind: FixtureKind, id: string): void {
  fixtureStore[kind].add(id);
}

export function takeFixtureIds(): {
  widget: string[];
  reading: string[];
  connected: string[];
} {
  const values = {
    widget: [...fixtureStore.widget],
    reading: [...fixtureStore.reading],
    connected: [...fixtureStore.connected],
  };
  fixtureStore.widget.clear();
  fixtureStore.reading.clear();
  fixtureStore.connected.clear();
  return values;
}
