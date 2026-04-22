"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ConnectedAccountRow } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";

type ProviderKey = ConnectedAccountRow["provider"];

interface ProviderCardDefinition {
  provider: ProviderKey;
  title: string;
  description: string;
}

const PROVIDER_CARDS: ProviderCardDefinition[] = [
  {
    provider: "spotify",
    title: "Spotify",
    description: "Used by recent tracks, top artists, top tracks, and now playing widgets.",
  },
  {
    provider: "github",
    title: "GitHub",
    description: "Optional OAuth for higher rate limits. Public username widgets work without it.",
  },
  {
    provider: "twitter",
    title: "Twitter / X",
    description: "Optional provider identity for tweet-based widgets.",
  },
];

interface ConnectionCardProps {
  accounts: ConnectedAccountRow[];
}

interface ConnectApiResponse {
  authorizeUrl?: string;
  error?: string;
}

interface DisconnectApiResponse {
  success?: boolean;
  error?: string;
}

function getAccountForProvider(
  accounts: ConnectedAccountRow[],
  provider: ProviderKey,
): ConnectedAccountRow | null {
  return accounts.find((account) => account.provider === provider) ?? null;
}

export function ConnectionCard({ accounts }: ConnectionCardProps): React.JSX.Element {
  const [isPendingProvider, setIsPendingProvider] = useState<ProviderKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function connectProvider(provider: ProviderKey): Promise<void> {
    setIsPendingProvider(provider);
    setErrorMessage(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/connect/${provider}`, {
        method: "POST",
      });
      const json = (await response.json()) as ConnectApiResponse;
      if (!response.ok || !json.authorizeUrl) {
        throw new Error(json.error ?? `Unable to connect ${provider}.`);
      }
      window.location.href = json.authorizeUrl;
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : `Unable to connect ${provider}.`);
    } finally {
      setIsPendingProvider(null);
    }
  }

  async function disconnectProvider(provider: ProviderKey): Promise<void> {
    setIsPendingProvider(provider);
    setErrorMessage(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/disconnect/${provider}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as DisconnectApiResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? `Unable to disconnect ${provider}.`);
      }
      setMessage(`${provider} disconnected. Refresh page to update status.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : `Unable to disconnect ${provider}.`);
    } finally {
      setIsPendingProvider(null);
    }
  }

  return (
    <div className="space-y-3">
      {PROVIDER_CARDS.map((definition) => {
        const account = getAccountForProvider(accounts, definition.provider);
        const connected = Boolean(account);
        const isPending = isPendingProvider === definition.provider;
        const actionLabel = connected ? "Disconnect" : "Connect";
        const statusDetail =
          account?.needs_reauth
            ? "Token expired. Reconnect required."
            : account
              ? `Connected as ${account.provider_user_id}`
              : "Not connected";
        return (
          <article key={definition.provider} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">{definition.title}</h2>
                <p className="text-sm text-muted-foreground">{definition.description}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  connected
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {connected ? "Connected" : "Not connected"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">{statusDetail}</p>

            <Button
              type="button"
              variant={connected ? "outline-solid" : "default"}
              disabled={isPending}
              onClick={() => {
                if (connected) {
                  void disconnectProvider(definition.provider);
                } else {
                  void connectProvider(definition.provider);
                }
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Working
                </>
              ) : (
                actionLabel
              )}
            </Button>
          </article>
        );
      })}

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
    </div>
  );
}
