import { SetupWizard } from "@/components/setup-wizard";
import { fr } from "@/i18n/fr";
import { getStaffContext } from "@/lib/server-context";

export const instant = false;

export default async function SetupPage() {
  const ctx = await getStaffContext();
  if (ctx?.role !== "owner") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{fr.setup.title}</h1>
        <p className="rounded-md bg-muted px-3 py-2 text-sm">{fr.common.ownerOnly}</p>
      </div>
    );
  }
  return <SetupWizard />;
}
