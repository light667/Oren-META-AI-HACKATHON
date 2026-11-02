import { notFound } from "next/navigation";
import { PublicChat, type PublicMenuItem } from "@/components/public-chat";
import { createWebDeps, resolveBusinessBySlug, whatsappNumber } from "@/channels/web/server";
import { getBusinessOpenStatus } from "@/lib/opening-hours";

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

  const [info, menu] = await Promise.all([
    deps.store.getBusinessInfo(business.id),
    deps.store.listMenuItems(business.id),
  ]);

  const timezone = (business.config as { timezone?: string })?.timezone ?? "Africa/Lome";
  const { isOpen, todayHours } = getBusinessOpenStatus(info?.openingHours ?? {}, timezone);

  const menuItems: PublicMenuItem[] = menu.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    priceFcfa: item.priceFcfa,
    category: item.category,
    available: item.available,
  }));

  return (
    <PublicChat
      slug={business.slug}
      businessName={business.name}
      whatsappDigits={whatsappNumber(business)}
      menuItems={menuItems}
      isOpen={isOpen}
      todayHours={todayHours}
    />
  );
}
