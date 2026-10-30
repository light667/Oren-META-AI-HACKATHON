import { notFound } from "next/navigation";
import { PublicChat } from "@/components/public-chat";
import { createWebDeps, resolveBusinessBySlug, whatsappNumber } from "@/channels/web/server";

export const instant = false;

export default async function PublicBusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const deps = createWebDeps();
  const business = await resolveBusinessBySlug(deps, slug);
  if (!business) notFound();

  return (
    <PublicChat
      slug={business.slug}
      businessName={business.name}
      whatsappDigits={whatsappNumber(business)}
    />
  );
}
