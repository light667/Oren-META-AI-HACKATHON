import { LoginForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";
import { fr } from "@/i18n/fr";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <LoginForm showError={params.erreur === "lien"} />
      <p className="mt-6 text-center text-xs text-muted-foreground">{fr.home.aiNotice}</p>
    </main>
  );
}
