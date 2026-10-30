import { LoginForm } from "@/components/auth-forms";
import { fr, productName } from "@/i18n/fr";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <p className="mb-6 text-center text-lg font-semibold">{productName}</p>
      <LoginForm showError={params.erreur === "lien"} />
      <p className="mt-6 text-center text-xs text-muted-foreground">{fr.home.aiNotice}</p>
    </main>
  );
}
