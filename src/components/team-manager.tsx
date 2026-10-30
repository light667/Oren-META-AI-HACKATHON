"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/i18n/fr";
import { inviteSchema } from "@/lib/validation";

export interface MemberData {
  id: string;
  user_id: string;
  role: "owner" | "staff";
  display_name: string | null;
}

export function TeamManager({
  members,
  currentUserId,
  canInvite,
}: {
  members: MemberData[];
  currentUserId: string;
  canInvite: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", displayName: "" });
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = inviteSchema.safeParse({
      email: form.email,
      displayName: form.displayName.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? fr.common.error);
      return;
    }
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? fr.common.error);
      setSent(true);
      setForm({ email: "", displayName: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{fr.team.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fr.team.description}</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{fr.team.membersTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{fr.team.membersEmpty}</p>
          ) : (
            <ul className="divide-y">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.display_name ?? member.user_id.slice(0, 8)}
                      {member.user_id === currentUserId && (
                        <span className="text-muted-foreground"> ({fr.team.you})</span>
                      )}
                    </p>
                  </div>
                  <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                    {member.role === "owner" ? fr.team.roleOwner : fr.team.roleStaff}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle>{fr.team.inviteTitle}</CardTitle>
            <CardDescription>{fr.team.inviteBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">{fr.team.nameLabel}</Label>
                <Input id="invite-name" placeholder={fr.team.namePlaceholder} value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">{fr.team.emailLabel}</Label>
                <Input id="invite-email" type="email" required placeholder={fr.auth.emailPlaceholder} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              {sent && <p className="text-sm text-muted-foreground">{fr.team.inviteSent}</p>}
              <Button type="submit" disabled={busy}>
                {busy ? fr.common.loading : fr.team.inviteSubmit}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
