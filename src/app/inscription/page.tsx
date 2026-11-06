import { SignupForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const instant = false;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <SignupForm invitation={params.invitation === "1"} />
    </AuthShell>
  );
}
