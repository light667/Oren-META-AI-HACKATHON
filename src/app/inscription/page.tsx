import { SignupForm } from "@/components/auth-forms";
import { productName } from "@/i18n/fr";

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <p className="mb-6 text-center text-lg font-semibold">{productName}</p>
      <SignupForm />
    </main>
  );
}
