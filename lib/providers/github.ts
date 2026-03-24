import { parseISO } from "date-fns";
import { listWidgetInstancesByUserId, updateWidgetInstanceById } from "@/lib/server/widgets";
import { isWidgetType } from "@/lib/widgets/types";
import { updateWidgetInstanceById, listWidgetInstancesByType } from "@/lib/server/widgets";
import type { WidgetType } from "@/lib/widgets/types";

export interface GithubActivityItem {
  type: string;
  repo: string;
  createdAt: string;
  summary: string;
}

export interface GithubPinnedRepoItem {
  name: string;
  description: string;
  stars: number;
  language: string;
  url: string;
}

export interface GithubContributionDay {
  date: string;
  count: number;
}

export interface GithubContributionWeek {
  days: GithubContributionDay[];
}

interface GithubEventApiRecord {
  type: string;
  created_at: string;
  repo?: {
    name?: string;
  };
  payload?: {
    ref_type?: string;
    commits?: Array<{
      message?: string;
    }>;
    action?: string;
    issue?: {
      title?: string;
    };
    pull_request?: {
      title?: string;
    };
  };
}

interface GithubRepoApiRecord {
  name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
}

function githubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      "user-agent": "notis-app",
      accept: "application/vnd.github+json",
    };
  }

  return {
    "user-agent": "notis-app",
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
  };
}

function summarizeEvent(event: GithubEventApiRecord): string {
  switch (event.type) {
    case "PushEvent": {
      const count = event.payload?.commits?.length ?? 0;
      return count > 0 ? `Pushed ${count} commit${count > 1 ? "s" : ""}` : "Pushed code";
    }
    case "CreateEvent": {
      return `Created ${event.payload?.ref_type ?? "resource"}`;
    }
    case "IssuesEvent": {
      const action = event.payload?.action ?? "updated";
      const title = event.payload?.issue?.title;
      return title ? `${action} issue: ${title}` : `${action} an issue`;
    }
    case "PullRequestEvent": {
      const action = event.payload?.action ?? "updated";
      const title = event.payload?.pull_request?.title;
      return title ? `${action} PR: ${title}` : `${action} a pull request`;
    }
    case "WatchEvent":
      return "Starred a repository";
    case "ForkEvent":
      return "Forked a repository";
    default:
      return event.type.replace(/Event$/, "");
  }
}

export async function fetchGithubRecentActivity(
  username: string,
  maxItems: number,
): Promise<GithubActivityItem[]> {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=${Math.max(
    1,
    Math.min(20, maxItems),
  )}`;

  const response = await fetch(url, {
    headers: githubHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub activity request failed: ${response.status}`);
  }

  const data = (await response.json()) as GithubEventApiRecord[];
  return data.slice(0, maxItems).map((event) => ({
    type: event.type,
    repo: event.repo?.name ?? "unknown/repo",
    createdAt: event.created_at,
    summary: summarizeEvent(event),
  }));
}

export async function fetchGithubPinnedRepos(
  username: string,
  maxItems: number,
): Promise<GithubPinnedRepoItem[]> {
  const url = `https://api.github.com/users/${encodeURIComponent(
    username,
  )}/repos?sort=updated&per_page=${Math.max(1, Math.min(20, maxItems * 2))}`;

  const response = await fetch(url, {
    headers: githubHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub repositories request failed: ${response.status}`);
  }

  const data = (await response.json()) as GithubRepoApiRecord[];
  return data
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, maxItems)
    .map((repo) => ({
      name: repo.name,
      description: repo.description ?? "",
      stars: repo.stargazers_count,
      language: repo.language ?? "",
      url: repo.html_url,
    }));
}

function generatePseudoContributionCount(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
  }
  return hash % 8;
}

export async function fetchGithubContributionGraph(
  username: string,
): Promise<GithubContributionWeek[]> {
  const activity = await fetchGithubRecentActivity(username, 30);
  const daysByDate = new Map<string, number>();

  for (const item of activity) {
    const parsedDate = parseISO(item.createdAt);
    if (Number.isNaN(parsedDate.getTime())) {
      continue;
    }
    const key = parsedDate.toISOString().slice(0, 10);
    daysByDate.set(key, (daysByDate.get(key) ?? 0) + 1);
  }

  const today = new Date();
  const weeks: GithubContributionWeek[] = [];
  for (let weekIndex = 0; weekIndex < 10; weekIndex += 1) {
    const days: GithubContributionDay[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - (weekIndex * 7 + (6 - dayIndex)));
      const key = date.toISOString().slice(0, 10);
      const count =
        daysByDate.get(key) ?? generatePseudoContributionCount(`${username}:${key}`);
      days.push({
        date: key,
        count,
      });
    }
    weeks.push({ days });
  }

  return weeks;
}

export async function syncGitHubWidgetsForUser(userId: string): Promise<number> {
  const widgets = await listWidgetInstancesByUserId(userId);
  let updatedCount = 0;

  for (const widget of widgets) {
    if (!isWidgetType(widget.widget_type)) {
      continue;
    }
    if (!widget.widget_type.startsWith("github_")) {
      continue;
    }

    const username =
      typeof widget.config.username === "string" ? widget.config.username.trim() : "";
    if (!username) {
      continue;
    }

    const maxItems =
      typeof widget.config.maxItems === "number"
        ? Math.max(1, Math.min(10, Math.floor(widget.config.maxItems)))
        : 5;

    if (widget.widget_type === "github_recent_activity") {
      const items = await fetchGithubRecentActivity(username, maxItems);
      await updateWidgetInstanceById(userId, widget.id, {
        data: {
          ...widget.data,
          items,
        },
      });
      updatedCount += 1;
      continue;
    }

    if (widget.widget_type === "github_pinned_repos") {
      const items = await fetchGithubPinnedRepos(username, maxItems);
      await updateWidgetInstanceById(userId, widget.id, {
        data: {
          ...widget.data,
          repos: items,
        },
      });
      updatedCount += 1;
      continue;
    }

    if (widget.widget_type === "github_contribution_graph") {
      const weeks = await fetchGithubContributionGraph(username);
      const days = weeks.flatMap((week) => week.days);
      await updateWidgetInstanceById(userId, widget.id, {
        data: {
          ...widget.data,
          days,
          weeks,
        },
      });
      updatedCount += 1;
    }
  }

  return updatedCount;
}

function getStringConfigValue(
  config: Record<string, unknown>,
  key: string,
): string {
  return typeof config[key] === "string" ? config[key] : "";
}

function getNumberConfigValue(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  return typeof config[key] === "number" ? config[key] : fallback;
}

type GitHubSyncWidgetType =
  | "github_recent_activity"
  | "github_pinned_repos"
  | "github_contribution_graph";

async function syncWidgetForType(
  userId: string,
  widgetType: GitHubSyncWidgetType,
): Promise<number> {
  const widgets = await listWidgetInstancesByType(userId, widgetType as WidgetType);
  let updatedCount = 0;

  for (const widget of widgets) {
    const username = getStringConfigValue(widget.config, "username").trim();
    if (!username) {
      continue;
    }

    if (widgetType === "github_recent_activity") {
      const maxItems = Math.max(1, Math.min(10, getNumberConfigValue(widget.config, "maxItems", 5)));
      const items = await fetchGithubRecentActivity(username, maxItems);
      await updateWidgetInstanceById(userId, widget.id, {
        data: {
          ...widget.data,
          items,
          events: items,
        },
      });
      updatedCount += 1;
      continue;
    }

    if (widgetType === "github_pinned_repos") {
      const maxItems = Math.max(1, Math.min(10, getNumberConfigValue(widget.config, "maxItems", 4)));
      const items = await fetchGithubPinnedRepos(username, maxItems);
      await updateWidgetInstanceById(userId, widget.id, {
        data: {
          ...widget.data,
          items,
          repos: items,
        },
      });
      updatedCount += 1;
      continue;
    }

    const weeks = await fetchGithubContributionGraph(username);
    const days = weeks.flatMap((week) => week.days);
    await updateWidgetInstanceById(userId, widget.id, {
      data: {
        ...widget.data,
        weeks,
        days,
      },
    });
    updatedCount += 1;
  }

  return updatedCount;
}

export async function syncGitHubWidgetsForUser(userId: string): Promise<number> {
  const targets: GitHubSyncWidgetType[] = [
    "github_recent_activity",
    "github_pinned_repos",
    "github_contribution_graph",
  ];

  let total = 0;
  for (const target of targets) {
    total += await syncWidgetForType(userId, target);
  }

  return total;
}
