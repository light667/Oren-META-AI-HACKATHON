import { notFound } from "next/navigation";
import { PublicChat, type PublicMenuItem } from "@/components/public-chat";
import { createWebDeps, resolveBusinessBySlug, whatsappNumber } from "@/channels/web/server";

export const instant = false;

const DAY_KEYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Ouvert ou fermé, calculé en code depuis les horaires (fuseau de Lomé). */
function openStatus(openingHours: Record<string, string>): {
  isOpen: boolean;
  todayHours: string | null;
} {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Lome" }),
  );
  const dayKey = DAY_KEYS[now.getDay()];
  const today = openingHours[dayKey] ?? null;
  if (!today || /fermé/i.test(today)) return { isOpen: false, todayHours: today };
  const match = today.match(/(\d{1,2})h(\d{2})?\s*[-–]\s*(\d{1,2})h(\d{2})?/i);
  if (!match) return { isOpen: false, todayHours: today };
  const start = Number(match[1]) * 60 + Number(match[2] ?? 0);
  const end = Number(match[3]) * 60 + Number(match[4] ?? 0);
  const current = now.getHours() * 60 + now.getMinutes();
  return { isOpen: current >= start && current < end, todayHours: today };
}

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
  const { isOpen, todayHours } = openStatus(info?.openingHours ?? {});
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
