"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/context";
import { inviteSchema } from "@/lib/validation";
import { Users, Mail, UserPlus, Check, AlertCircle, Shield } from "lucide-react";

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
  const { t } = useI18n();
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
      setError(parsed.error.issues[0]?.message ?? t.common.error);
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
      if (!response.ok) throw new Error(data?.error ?? t.common.error);
      setSent(true);
      setForm({ email: "", displayName: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t.team.title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t.team.description}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Liste des membres actuels */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-border/60 pb-4">
          <Users className="h-5 w-5 text-[#0ebb7c]" />
          <h2 className="font-heading text-lg font-bold text-foreground">
            {t.team.membersTitle}
          </h2>
        </div>

        {members.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t.team.membersEmpty}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary font-bold text-xs text-foreground">
                    {(member.display_name ?? member.user_id).charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {member.display_name ?? member.user_id.slice(0, 8)}
                      {member.user_id === currentUserId && (
                        <span className="text-xs font-normal text-muted-foreground"> ({t.team.you})</span>
                      )}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={member.role === "owner" ? "default" : "secondary"}
                  className={
                    member.role === "owner"
                      ? "bg-[#0ebb7c] text-white text-[10px] font-bold"
                      : "text-[10px] text-muted-foreground"
                  }
                >
                  {member.role === "owner" ? t.team.roleOwner : t.team.roleStaff}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulaire d'invitation */}
      {canInvite && (
        <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-border/60 pb-4">
            <UserPlus className="h-5 w-5 text-[#0ebb7c]" />
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                {t.team.inviteTitle}
              </h2>
              <p className="text-xs text-muted-foreground">{t.team.inviteBody}</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs font-semibold uppercase text-muted-foreground">
                  {t.team.emailLabel}
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="collaborateur@exemple.tg"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-name" className="text-xs font-semibold uppercase text-muted-foreground">
                  {t.team.nameLabel}
                </Label>
                <Input
                  id="invite-name"
                  placeholder={t.team.namePlaceholder}
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="h-10 rounded-xl bg-[#0ebb7c] px-6 text-xs font-bold text-white shadow-md shadow-[#0ebb7c]/20 hover:bg-[#0ca66e]"
            >
              {busy ? t.common.loading : t.team.inviteSubmit}
            </Button>

            {sent && (
              <p className="flex items-center gap-1.5 text-xs text-[#0ebb7c] font-semibold">
                <Check className="h-4 w-4" />
                <span>{t.team.inviteSent}</span>
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
