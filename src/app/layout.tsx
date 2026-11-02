import type { Metadata, Viewport } from "next";
import { en } from "@/i18n/en";
import "./globals.css";
import { I18nProvider } from "@/i18n/context";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: en.app.seo.title,
    template: `%s — ${en.app.title}`,
  },
  description: en.app.seo.description,
  keywords: en.app.seo.keywords,
  applicationName: en.app.title,
  authors: [{ name: en.app.title }],
  creator: en.app.title,
  publisher: en.app.title,
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, title: en.app.title },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: en.app.title,
    title: en.app.seo.title,
    description: en.app.seo.description,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: en.app.seo.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: en.app.seo.title,
    description: en.app.seo.description,
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
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
