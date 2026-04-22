import type { WidgetInstanceRecord } from "@/lib/widgets/types";
import { WidgetFrame } from "./widget-frame";

interface GithubPinnedReposWidgetProps {
  widget: WidgetInstanceRecord;
}

interface PinnedRepo {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
}

function isPinnedRepo(value: unknown): value is PinnedRepo {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "number" &&
    typeof record.name === "string" &&
    typeof record.html_url === "string" &&
    (typeof record.description === "string" || record.description === null) &&
    typeof record.stargazers_count === "number" &&
    (typeof record.language === "string" || record.language === null)
  );
}

export function GithubPinnedReposWidget({
  widget,
}: GithubPinnedReposWidgetProps): React.JSX.Element {
  const repos = Array.isArray(widget.data.repos)
    ? widget.data.repos.filter(isPinnedRepo)
    : [];

  return (
    <WidgetFrame title="Pinned Repositories">
      {repos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No repositories synced yet.</p>
      ) : (
        <ul className="space-y-3">
          {repos.slice(0, 4).map((repo) => (
            <li key={repo.id} className="rounded-md border p-3">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {repo.name}
              </a>
              {repo.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{repo.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                ★ {repo.stargazers_count}
                {repo.language ? ` • ${repo.language}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
}
