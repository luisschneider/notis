"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  children?: ReactNode;
  className?: string;
}

export function SignOutButton({
  children = "Sign out",
  className,
}: SignOutButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={isLoading}
      onClick={handleSignOut}
    >
      {isLoading ? "Signing out..." : children}
    </Button>
  );
}

