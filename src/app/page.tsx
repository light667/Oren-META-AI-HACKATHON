import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fr, productName } from "@/i18n/fr";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {fr.home.heading} {productName}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">{fr.home.intro}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{fr.home.cardTitle}</CardTitle>
          <CardDescription>{fr.home.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="business-name" className="text-sm font-medium">
              {fr.home.nameLabel}
            </label>
            <Input id="business-name" placeholder={fr.home.namePlaceholder} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button">{fr.home.primaryAction}</Button>
            <Dialog>
              <DialogTrigger render={<Button type="button" variant="outline" />}>
                {fr.home.dialogTrigger}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{fr.home.dialogTitle}</DialogTitle>
                  <DialogDescription>{fr.home.dialogBody}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button type="button" />}>
                    {fr.home.dialogClose}
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">{fr.home.aiNotice}</p>
    </main>
  );
}
