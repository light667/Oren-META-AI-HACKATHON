import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { fr } from "@/i18n/fr";
import "./globals.css";
import { I18nProvider } from "@/i18n/context";
import { siteUrl as getSiteUrl } from "@/lib/site-url";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: fr.app.seo.title,
    template: `%s — ${fr.app.title}`,
  },
  description: fr.app.seo.description,
  keywords: fr.app.seo.keywords,
  applicationName: fr.app.title,
  authors: [{ name: fr.app.title }],
  creator: fr.app.title,
  publisher: fr.app.title,
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, title: fr.app.title },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: fr.app.title,
    title: fr.app.seo.title,
    description: fr.app.seo.description,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: fr.app.seo.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: fr.app.seo.title,
    description: fr.app.seo.description,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('oren-theme');if(t==='dark'){document.documentElement.classList.add('dark')}var l=localStorage.getItem('oren-locale');if(l){document.documentElement.lang=l}}catch(e){}",
          }}
        />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
