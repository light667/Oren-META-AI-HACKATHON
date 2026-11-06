import { AuthAction } from "@/components/auth-action";
import { AuthShell } from "@/components/auth-shell";

export const instant = false;

/** Lien des e-mails Firebase (vérification, mot de passe) sur le domaine Oren. */
export default async function AuthActionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; oobCode?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <AuthAction mode={params.mode ?? ""} oobCode={params.oobCode ?? ""} />
    </AuthShell>
  );
}
