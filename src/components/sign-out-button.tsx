"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();
  const { t } = useI18n();

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } finally {
      router.push("/connexion");
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={signOut}
      className="h-8 w-full justify-start rounded-xl text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
    >
      <LogOut className="mr-2 h-3.5 w-3.5" />
      <span>{t.auth.signOut}</span>
    </Button>
  );
}
