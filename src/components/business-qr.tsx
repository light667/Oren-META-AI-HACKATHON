"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { LogoMark } from "@/components/logo";
import { Copy, Check, Download, ExternalLink, QrCode } from "lucide-react";

/**
 * Présentation du QR Code et du lien public (Tâche D5 / docs/DESIGN.md).
 * Sans phrase en double, sans soulignement sur le Q, URL depuis NEXT_PUBLIC_APP_URL.
 */
export function BusinessQr({ slug, businessName }: { slug: string; businessName: string }) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const initialBase = appUrl ? appUrl.replace(/\/+$/, "") : (typeof window !== "undefined" ? window.location.origin : "");
  const [publicUrl, setPublicUrl] = useState(() => `${initialBase}/${slug}`);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")
      : window.location.origin;
    const url = `${base}/${slug}`;
    setPublicUrl(url);

    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 720,
      margin: 2,
      color: {
        dark: "#11100e",
        light: "#ffffff",
      },
    })
      .then((generated) => {
        if (!cancelled) setDataUrl(generated);
      })
      .catch(() => setDataUrl(null));

    return () => {
      cancelled = true;
    };
  }, [slug]);

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function downloadQr() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl no-underline">
          {t.qr.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.qr.body}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Chevalet / Panneau de comptoir */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-xs overflow-hidden rounded-3xl border border-border/80 bg-card p-6 text-center text-foreground shadow-2xl">
            <div className="flex items-center justify-center gap-2 pb-4">
              <LogoMark className="h-6 w-6 text-[#0ebb7c]" />
              <span className="font-heading text-base font-extrabold tracking-tight text-foreground no-underline">
                Oren
              </span>
            </div>

            <div className="my-3 mx-auto flex h-52 w-52 items-center justify-center rounded-2xl bg-white p-3 shadow-inner border border-border/40">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dataUrl}
                  alt={businessName}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <QrCode className="h-8 w-8 animate-pulse text-primary" />
                  <span className="text-xs">{t.qr.generating}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <h3 className="font-heading text-lg font-bold text-foreground truncate no-underline">
                {businessName}
              </h3>
              <p className="text-xs text-muted-foreground pt-0.5">Scannez pour voir le menu et commander</p>
            </div>
          </div>
        </div>

        {/* Détails & Boutons d'export */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-5 shadow-xs">
            {/* Champ Lien public avec copie rapide */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.qr.linkLabel}
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-secondary/30 p-2">
                <span className="truncate flex-1 px-2 font-mono text-xs sm:text-sm text-foreground">
                  {publicUrl}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-background px-3 text-xs font-bold text-foreground border border-border/80 shadow-xs hover:bg-secondary active:scale-95 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span className="text-primary">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Actions : Télécharger PNG et Voir ma page client */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="button"
                onClick={downloadQr}
                disabled={!dataUrl}
                className="h-11 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
              >
                <Download className="mr-2 h-4 w-4" />
                <span>{t.qr.download}</span>
              </Button>

              <Link
                href={`/${slug}`}
                target="_blank"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border/80 bg-card px-5 text-xs font-semibold text-foreground hover:bg-secondary active:scale-95 transition-all"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span>{t.ownerHome.viewPublic}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
