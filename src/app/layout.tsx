import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { fr } from "@/i18n/fr";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: fr.app.title,
  description: fr.app.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
