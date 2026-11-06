import { redirect } from "next/navigation";
import { connection } from "next/server";
import { OnboardingForm } from "@/components/onboarding-form";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser, getStaffContext } from "@/lib/server-context";

export const instant = false;

export default async function WelcomePage() {
  // Page propre à chaque visiteur (session) : jamais pré-rendue.
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const ctx = await getStaffContext();
  if (ctx) redirect("/app/commandes");

  const meta = user.user_metadata ?? {};
  return (
    <AuthShell>
      <OnboardingForm
        invitedBusiness={Boolean(meta.business_id)}
        initial={{
          businessName: (meta.business_name as string | undefined) ?? "",
          slug: (meta.slug as string | undefined) ?? "",
          phone: (meta.phone as string | undefined) ?? "",
        }}
      />
    </AuthShell>
  );
}
