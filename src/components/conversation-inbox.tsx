"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fr } from "@/i18n/fr";

export interface InboxItem {
  id: string;
  channel: string;
  status: string;
  assistant_paused: boolean;
  updated_at: string;
  preview: string;
}

export function ConversationInbox({ items }: { items: InboxItem[] }) {
  const [filter, setFilter] = useState<"all" | "handoff">("all");
  const visible = items.filter((i) =>
    filter === "all" ? true : i.status === "a_reprendre" || i.assistant_paused,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{fr.conversations.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fr.conversations.description}</p>
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          {fr.conversations.filterAll}
        </Button>
        <Button type="button" size="sm" variant={filter === "handoff" ? "default" : "outline"} onClick={() => setFilter("handoff")}>
          {fr.conversations.filterHandoff}
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {filter === "handoff" ? fr.conversations.emptyFiltered : fr.conversations.empty}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id}>
              <Card>
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {item.channel} ·{" "}
                      {new Date(item.updated_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="flex gap-2">
                      {item.status === "a_reprendre" && <Badge>{fr.conversations.handoffBadge}</Badge>}
                      {item.assistant_paused && <Badge variant="secondary">{fr.conversations.pausedBadge}</Badge>}
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm">{item.preview}</p>
                  <Button type="button" size="sm" variant="outline" render={<Link href={`/app/conversations/${item.id}`} />}>
                    {fr.conversations.open}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
