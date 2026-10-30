import { notFound } from "next/navigation";
import { ConversationThread, type ThreadMessage } from "@/components/conversation-thread";
import { fr } from "@/i18n/fr";
import { getStaffContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getStaffContext();
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, assistant_paused, status")
    .eq("id", id)
    .eq("business_id", ctx?.businessId ?? "")
    .maybeSingle();
  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{fr.conversations.title}</h1>
      <ConversationThread
        conversationId={id}
        businessId={ctx?.businessId ?? ""}
        initialMessages={(messages as ThreadMessage[] | null) ?? []}
        initiallyPaused={Boolean(conversation.assistant_paused)}
      />
    </div>
  );
}
