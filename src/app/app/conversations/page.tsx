import { ConversationInbox, type InboxItem } from "@/components/conversation-inbox";
import { getStaffContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ConversationsPage() {
  const ctx = await getStaffContext();
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, channel, status, assistant_paused, updated_at")
    .eq("business_id", ctx?.businessId ?? "")
    .order("updated_at", { ascending: false })
    .limit(50);

  const items: InboxItem[] = [];
  for (const conv of conversations ?? []) {
    const { data: last } = await supabase
      .from("messages")
      .select("content")
      .eq("conversation_id", conv.id as string)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    items.push({
      id: conv.id as string,
      channel: conv.channel as string,
      status: conv.status as string,
      assistant_paused: Boolean(conv.assistant_paused),
      updated_at: conv.updated_at as string,
      preview: (last?.content as string | undefined) ?? "",
    });
  }

  return <ConversationInbox items={items} />;
}
