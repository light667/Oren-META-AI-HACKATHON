"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fr } from "@/i18n/fr";

/** Lien public + QR code à télécharger, pour affichage en boutique. */
export function BusinessQr({ slug, businessName }: { slug: string; businessName: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [publicUrl] = useState(() =>
    typeof window === "undefined" ? `/${slug}` : `${window.location.origin}/${slug}`,
  );

  useEffect(() => {
    const url = `${window.location.origin}/${slug}`;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 640, margin: 2 })
      .then((generated) => {
        if (!cancelled) setDataUrl(generated);
      })
      .catch(() => setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fr.qr.title}</CardTitle>
        <CardDescription>{fr.qr.body}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={businessName} className="h-40 w-40 rounded-md bg-white p-1" />
        ) : (
          <p className="text-sm text-muted-foreground">{fr.qr.generating}</p>
        )}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{fr.qr.linkLabel}</p>
            <p className="break-all text-sm text-muted-foreground">{publicUrl}</p>
          </div>
          {dataUrl && (
            <Button
              type="button"
              variant="outline"
              render={<a href={dataUrl} download={`qr-${slug}.png`} />}
            >
              {fr.qr.download}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
