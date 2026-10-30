import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { productName } from "@/i18n/fr";
import { getCurrentUser, getStaffContext } from "@/lib/server-context";

export const instant = false;

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const ctx = await getStaffContext();
  if (ctx) redirect("/app/commandes");

  const meta = user.user_metadata ?? {};
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <p className="mb-6 text-center text-lg font-semibold">{productName}</p>
      <OnboardingForm
        invitedBusiness={Boolean(meta.business_id)}
        initial={{
          businessName: (meta.business_name as string | undefined) ?? "",
          slug: (meta.slug as string | undefined) ?? "",
          phone: (meta.phone as string | undefined) ?? "",
        }}
      />
    </main>
  );
}
