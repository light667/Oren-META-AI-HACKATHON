import { BusinessQr } from "@/components/business-qr";
import { getStaffContext } from "@/lib/server-context";

export const instant = false;

export default async function LinkQrPage() {
  const ctx = await getStaffContext();
  const slug = ctx?.business.slug ?? "";
  return (
    <div className="space-y-5">
      <BusinessQr slug={slug} businessName={ctx?.business.name ?? ""} />
    </div>
  );
}
