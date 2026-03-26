import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetInstanceRow } from "@/lib/supabase/types";

const {
  mockListWidgetInstancesByUserId,
  mockUpdateWidgetInstanceById,
  mockCreateClient,
  mockParserParseUrl,
} = vi.hoisted(() => ({
  mockListWidgetInstancesByUserId: vi.fn(),
  mockUpdateWidgetInstanceById: vi.fn(),
  mockCreateClient: vi.fn(),
  mockParserParseUrl: vi.fn(),
}));

vi.mock("@/lib/server/widgets", () => ({
  listWidgetInstancesByUserId: mockListWidgetInstancesByUserId,
  updateWidgetInstanceById: mockUpdateWidgetInstanceById,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("rss-parser", () => {
  class MockParser {
    parseURL = mockParserParseUrl;
  }
  return {
    default: MockParser,
  };
});

import {
  fetchGithubContributionGraph,
  fetchGithubPinnedRepos,
  fetchGithubRecentActivity,
  syncGitHubWidgetsForUser,
} from "@/lib/providers/github";
import {
  buildTwitterPinnedTweetData,
  buildTwitterRecentTweetsData,
  fetchTwitterOEmbedHtml,
  syncTwitterWidgetsForUser,
} from "@/lib/providers/twitter";
import {
  fetchSubstackPosts,
  syncSubstackWidgetById,
  syncSubstackWidgetsForUser,
} from "@/lib/providers/substack";

interface MockResponseInit {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
}

function createMockResponse(init: MockResponseInit): Response {
  return {
    ok: init.ok,
    status: init.status,
    json: vi.fn(async () => init.json),
    text: vi.fn(async () => init.text ?? ""),
  } as unknown as Response;
}

function createWidgetInstanceRow(
  partial: Partial<WidgetInstanceRow> & Pick<WidgetInstanceRow, "id" | "user_id" | "widget_type">,
): WidgetInstanceRow {
  return {
    id: partial.id,
    user_id: partial.user_id,
    widget_type: partial.widget_type,
    position: partial.position ?? 0,
    config: partial.config ?? {},
    data: partial.data ?? {},
    is_visible: partial.is_visible ?? true,
    last_synced_at: partial.last_synced_at ?? null,
    created_at: partial.created_at ?? new Date().toISOString(),
    updated_at: partial.updated_at ?? new Date().toISOString(),
  };
}

describe("github provider helpers and sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockListWidgetInstancesByUserId.mockReset();
    mockUpdateWidgetInstanceById.mockReset();
  });

  it("fetches github recent activity and maps summaries", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: [
          {
            type: "PushEvent",
            created_at: "2025-01-01T00:00:00.000Z",
            repo: { name: "acme/repo" },
            payload: { commits: [{ message: "feat: one" }, { message: "fix: two" }] },
          },
        ],
      }),
    );

    const items = await fetchGithubRecentActivity("octocat", 3);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      type: "PushEvent",
      repo: "acme/repo",
      createdAt: "2025-01-01T00:00:00.000Z",
      summary: "Pushed 2 commits",
    });
  });

  it("fetches github pinned repos sorted by stars", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: [
          {
            name: "repo-low",
            description: null,
            stargazers_count: 2,
            language: null,
            html_url: "https://github.com/acme/repo-low",
          },
          {
            name: "repo-high",
            description: "High stars",
            stargazers_count: 10,
            language: "TypeScript",
            html_url: "https://github.com/acme/repo-high",
          },
        ],
      }),
    );

    const repos = await fetchGithubPinnedRepos("octocat", 1);
    expect(repos).toEqual([
      {
        name: "repo-high",
        description: "High stars",
        stars: 10,
        language: "TypeScript",
        url: "https://github.com/acme/repo-high",
      },
    ]);
  });

  it("builds contribution graph weeks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: [
          {
            type: "PushEvent",
            created_at: "2025-01-01T00:00:00.000Z",
            repo: { name: "acme/repo" },
            payload: { commits: [{ message: "feat" }] },
          },
        ],
      }),
    );

    const weeks = await fetchGithubContributionGraph("octocat");
    expect(weeks).toHaveLength(10);
    expect(weeks[0]?.days).toHaveLength(7);
  });

  it("syncs all github widget variants", async () => {
    mockListWidgetInstancesByUserId.mockResolvedValue([
      createWidgetInstanceRow({
        id: "w-activity",
        user_id: "user-1",
        widget_type: "github_recent_activity",
        config: { username: "octocat", maxItems: 5 },
      }),
      createWidgetInstanceRow({
        id: "w-repos",
        user_id: "user-1",
        widget_type: "github_pinned_repos",
        config: { username: "octocat", maxItems: 4 },
      }),
      createWidgetInstanceRow({
        id: "w-graph",
        user_id: "user-1",
        widget_type: "github_contribution_graph",
        config: { username: "octocat" },
      }),
    ]);
    mockUpdateWidgetInstanceById.mockResolvedValue(createWidgetInstanceRow({
      id: "w-activity",
      user_id: "user-1",
      widget_type: "github_recent_activity",
    }));

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          json: [{ type: "PushEvent", created_at: "2025-01-01T00:00:00.000Z", repo: { name: "a/b" } }],
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          json: [{ name: "repo", description: "", stargazers_count: 1, language: "TS", html_url: "https://repo" }],
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          json: [{ type: "PushEvent", created_at: "2025-01-01T00:00:00.000Z", repo: { name: "a/b" } }],
        }),
      );

    const updated = await syncGitHubWidgetsForUser("user-1");
    expect(updated).toBe(3);
    expect(mockUpdateWidgetInstanceById).toHaveBeenCalledTimes(3);
  });
});

describe("twitter provider helpers and sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreateClient.mockReset();
  });

  it("builds twitter widget data from widget payloads", () => {
    const recent = buildTwitterRecentTweetsData({
      id: "w1",
      user_id: "u1",
      widget_type: "twitter_recent_tweets",
      position: 0,
      config: {},
      data: { tweetUrls: [" https://x.com/test/status/1 ", 7] },
      is_visible: true,
      last_synced_at: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });
    const pinned = buildTwitterPinnedTweetData({
      id: "w2",
      user_id: "u1",
      widget_type: "twitter_pinned_tweet",
      position: 0,
      config: {},
      data: { tweetUrl: " https://x.com/test/status/2 " },
      is_visible: true,
      last_synced_at: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });
    expect(recent).toEqual({ tweetUrls: ["https://x.com/test/status/1"] });
    expect(pinned).toEqual({ tweetUrl: "https://x.com/test/status/2" });
  });

  it("fetches twitter oembed html", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createMockResponse({ ok: true, status: 200, json: { html: "<blockquote>tweet</blockquote>" } }),
    );
    const html = await fetchTwitterOEmbedHtml("https://x.com/test/status/1");
    expect(html).toBe("<blockquote>tweet</blockquote>");
  });

  it("syncs twitter widgets for a user", async () => {
    const queryResult = {
      data: [
        {
          id: "w-recent",
          widget_type: "twitter_recent_tweets",
          data: { tweetUrls: ["https://x.com/test/status/1"] },
          config: {},
        },
        {
          id: "w-pinned",
          widget_type: "twitter_pinned_tweet",
          data: {},
          config: { pinnedTweetUrl: "https://x.com/test/status/2" },
        },
      ],
      error: null,
    };
    const selectChain = {
      eq: vi.fn(),
      in: vi.fn(),
    };
    selectChain.eq.mockImplementation(() => selectChain);
    selectChain.in.mockResolvedValue(queryResult);
    const updateFinalEq = vi.fn().mockResolvedValue({ error: null });
    const updateFirstEq = vi.fn().mockReturnValue({ eq: updateFinalEq });
    const updateMock = vi.fn().mockReturnValue({ eq: updateFirstEq });

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "widget_instances") {
          return {
            select: vi.fn().mockReturnValue(selectChain),
            update: updateMock,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createMockResponse({ ok: true, status: 200, json: { html: "<blockquote>1</blockquote>" } }),
      )
      .mockResolvedValueOnce(
        createMockResponse({ ok: true, status: 200, json: { html: "<blockquote>2</blockquote>" } }),
      );

    const synced = await syncTwitterWidgetsForUser("user-1");
    expect(synced).toBe(2);
    expect(updateMock).toHaveBeenCalledTimes(2);
  });
});

describe("substack provider helpers and sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockListWidgetInstancesByUserId.mockReset();
    mockUpdateWidgetInstanceById.mockReset();
    mockParserParseUrl.mockReset();
  });

  it("fetches and normalizes substack posts", async () => {
    mockParserParseUrl.mockResolvedValue({
      items: [
        {
          title: "Post One",
          link: "https://newsletter.substack.com/p/post-one",
          isoDate: "2025-01-02T00:00:00.000Z",
          contentSnippet: "Summary",
        },
      ],
    });

    const posts = await fetchSubstackPosts("newsletter", 3);
    expect(posts).toEqual([
      {
        title: "Post One",
        url: "https://newsletter.substack.com/p/post-one",
        publishedAt: "2025-01-02T00:00:00.000Z",
        excerpt: "Summary",
      },
    ]);
  });

  it("syncs a single substack widget by id", async () => {
    mockParserParseUrl.mockResolvedValue({
      items: [
        {
          title: "Featured",
          link: "https://newsletter.substack.com/p/featured",
          isoDate: "2025-01-03T00:00:00.000Z",
          contentSnippet: "Featured summary",
        },
      ],
    });
    const updatedWidget = createWidgetInstanceRow({
      id: "w-substack",
      user_id: "user-1",
      widget_type: "substack_featured_post",
      data: { post: { title: "Featured" } },
    });
    mockUpdateWidgetInstanceById.mockResolvedValue(updatedWidget);

    const result = await syncSubstackWidgetById(
      "user-1",
      createWidgetInstanceRow({
        id: "w-substack",
        user_id: "user-1",
        widget_type: "substack_featured_post",
        config: { publication: "newsletter", featuredUrl: "https://newsletter.substack.com/p/featured" },
      }),
    );
    expect(result).toEqual(updatedWidget);
  });

  it("syncs substack widgets list for user", async () => {
    mockParserParseUrl.mockResolvedValue({
      items: [
        {
          title: "Post",
          link: "https://newsletter.substack.com/p/post",
          isoDate: "2025-01-03T00:00:00.000Z",
          contentSnippet: "Summary",
        },
      ],
    });
    mockListWidgetInstancesByUserId.mockResolvedValue([
      createWidgetInstanceRow({
        id: "w1",
        user_id: "user-1",
        widget_type: "substack_latest_posts",
        config: { publication: "newsletter", maxItems: 2 },
      }),
      createWidgetInstanceRow({
        id: "w2",
        user_id: "user-1",
        widget_type: "substack_featured_post",
        config: { publication: "newsletter", featuredUrl: "" },
      }),
    ]);
    mockUpdateWidgetInstanceById.mockImplementation(async (_userId, id) =>
      createWidgetInstanceRow({
        id,
        user_id: "user-1",
        widget_type: id === "w1" ? "substack_latest_posts" : "substack_featured_post",
      }),
    );

    const result = await syncSubstackWidgetsForUser("user-1");
    expect(result.updated).toBe(2);
    expect(result.widget?.id).toBe("w2");
  });
});
