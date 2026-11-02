import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { Logo } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { getCurrentUser, getStaffContext } from "@/lib/server-context";

export const instant = false;

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const ctx = await getStaffContext();
  if (ctx) redirect("/app/commandes");

  const meta = user.user_metadata ?? {};
  return (
    <div className="relative flex min-h-full flex-col justify-between bg-background antialiased">
      {/* Halo vert ambiance */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-[#0ebb7c]/10 blur-3xl" />

      {/* Barre supérieure */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-4 sm:p-6">
        <Link href="/" className="transition-transform hover:scale-105">
          <Logo markClassName="h-7 w-7" wordmarkClassName="font-heading text-xl font-bold tracking-tight text-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Formulaire centré */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        <OnboardingForm
          invitedBusiness={Boolean(meta.business_id)}
          initial={{
            businessName: (meta.business_name as string | undefined) ?? "",
            slug: (meta.slug as string | undefined) ?? "",
            phone: (meta.phone as string | undefined) ?? "",
          }}
        />
      </main>

      {/* Bas de page minimal */}
      <div className="p-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Oren. Lomé, Togo.
      </div>
    </div>
  );
}
