"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileRow } from "@/lib/supabase/types";
import { Loader2, Upload } from "lucide-react";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

interface SettingsFormProps {
  initialProfile: ProfileRow;
}

function getInitials(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SettingsForm({ initialProfile }: SettingsFormProps): React.JSX.Element {
  const [username, setUsername] = useState(initialProfile.username);
  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fallbackName = useMemo(() => {
    const source = displayName || initialProfile.username;
    return getInitials(source) || "NU";
  }, [displayName, initialProfile.username]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
  }

  async function uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/profile", {
      method: "POST",
      body: formData,
    });

    const json = (await response.json()) as { avatar_url?: string; error?: string };
    if (!response.ok || !json.avatar_url) {
      throw new Error(json.error ?? "Unable to upload avatar.");
    }

    return json.avatar_url;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        nextAvatarUrl = await uploadAvatar(avatarFile);
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          display_name: displayName,
          bio,
          avatar_url: nextAvatarUrl,
        }),
      });

      const json = (await response.json()) as { profile?: ProfileRow; error?: string };

      if (!response.ok || !json.profile) {
        throw new Error(json.error ?? "Unable to save your profile.");
      }

      setUsername(json.profile.username);
      setDisplayName(json.profile.display_name ?? "");
      setBio(json.profile.bio ?? "");
      setAvatarUrl(json.profile.avatar_url ?? "");
      setAvatarFile(null);
      setSuccessMessage("Profile updated.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "An unexpected error occurred.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} alt="Profile avatar" />
              <AvatarFallback>{fallbackName}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              name="display_name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              pattern="[a-z0-9_-]{3,30}"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, underscores, and hyphens only.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell people what you are into."
              rows={4}
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {successMessage}
            </p>
          ) : null}

          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
