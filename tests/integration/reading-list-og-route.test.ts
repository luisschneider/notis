import { beforeEach, describe, expect, it, vi } from "vitest";

interface OgsResult {
  result: {
    ogTitle?: string;
    twitterTitle?: string;
    dcTitle?: string;
    ogDescription?: string;
    twitterDescription?: string;
    dcDescription?: string;
    ogImage?: Array<{ url?: string }>;
    ogSiteName?: string;
    requestUrl?: string;
  };
}

const mockOgs = vi.hoisted(() => vi.fn<() => Promise<OgsResult>>());

vi.mock("open-graph-scraper", () => ({
  default: mockOgs,
}));

import { POST } from "@/app/api/widgets/reading-list/og-fetch/route";

describe("reading list OG fetch route integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockOgs.mockReset();
  });

  it("returns normalized OG data for a valid URL", async () => {
    mockOgs.mockResolvedValueOnce({
      result: {
        ogTitle: "Example Title",
        ogDescription: "Example Description",
        ogImage: [{ url: "https://example.com/image.png" }],
        ogSiteName: "Example",
        requestUrl: "https://example.com/post",
      },
    });

    const request = new Request("http://localhost:3000/api/widgets/reading-list/og-fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/post" }),
    });

    const response = await POST(request);
    const json = (await response.json()) as {
      title?: string;
      description?: string;
      image?: string;
      siteName?: string;
      url?: string;
    };

    expect(response.status).toBe(200);
    expect(json).toEqual({
      title: "Example Title",
      description: "Example Description",
      image: "https://example.com/image.png",
      siteName: "Example",
      url: "https://example.com/post",
    });
  });

  it("returns validation error on invalid payload", async () => {
    const request = new Request("http://localhost:3000/api/widgets/reading-list/og-fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not-a-url" }),
    });

    const response = await POST(request);
    const json = (await response.json()) as { error?: string };
    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid request payload.");
  });

  it("returns fetch error when og scraper throws", async () => {
    mockOgs.mockRejectedValueOnce(new Error("metadata failure"));

    const request = new Request("http://localhost:3000/api/widgets/reading-list/og-fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/post" }),
    });

    const response = await POST(request);
    const json = (await response.json()) as { error?: string };
    expect(response.status).toBe(400);
    expect(json.error).toContain("metadata failure");
  });
});
