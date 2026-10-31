import { SignupForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <SignupForm />
    </main>
  );
}
