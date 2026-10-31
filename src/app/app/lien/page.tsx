import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BusinessQr } from "@/components/business-qr";
import { fr } from "@/i18n/fr";
import { getStaffContext } from "@/lib/server-context";

export const instant = false;

export default async function LinkQrPage() {
  const ctx = await getStaffContext();
  const slug = ctx?.business.slug ?? "";
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{fr.nav.linkQr}</h1>
        <p className="mt-1 text-muted-foreground">{fr.qr.body}</p>
      </div>
      <BusinessQr slug={slug} businessName={ctx?.business.name ?? ""} />
      <Button render={<Link href={`/${slug}`} />} className="h-11">
        {fr.ownerHome.viewPublic}
      </Button>
    </div>
  );
}
