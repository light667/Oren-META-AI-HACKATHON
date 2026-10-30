"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    try {
      await createClient().auth.signOut();
    } finally {
      router.push("/connexion");
      router.refresh();
    }
  }
  return (
    <Button type="button" variant="ghost" size="sm" onClick={signOut}>
      {fr.auth.signOut}
    </Button>
  );
}
