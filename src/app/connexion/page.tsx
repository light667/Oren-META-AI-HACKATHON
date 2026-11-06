import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; verifie?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <LoginForm showError={params.erreur === "lien"} verified={params.verifie === "1"} />
    </AuthShell>
  );
}
