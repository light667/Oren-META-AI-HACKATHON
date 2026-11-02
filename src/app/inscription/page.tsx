import { SignupForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { fr } from "@/i18n/fr";

export const instant = false;

export default function SignupPage() {
  return (
    <div className="relative flex min-h-full flex-col justify-between bg-background antialiased">

      {/* Barre supérieure minimale */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-4 sm:p-6">
        <Link href="/" className="transition-transform hover:scale-105">
          <Logo markClassName="h-7 w-7 text-[#0ebb7c]" wordmarkClassName="font-heading text-xl font-extrabold tracking-tight text-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Formulaire centré */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        <SignupForm />
      </main>

      {/* Bas de page minimal */}
      <div className="p-4 text-center text-xs text-muted-foreground">
        © 2026 Oren. Lomé, Togo.
      </div>
    </div>
  );
}
