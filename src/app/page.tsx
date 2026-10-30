import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fr, productName } from "@/i18n/fr";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{productName}</h1>
        <p className="text-base leading-7 text-muted-foreground">{fr.home.intro}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{fr.home.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">{fr.home.cardBody}</p>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/inscription" />}>{fr.home.signupCta}</Button>
            <Button render={<Link href="/connexion" />} variant="outline">
              {fr.home.loginCta}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">{fr.home.aiNotice}</p>
    </main>
  );
}
