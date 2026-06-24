import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";

import { Providers } from "@/components/layout/Providers";
import { authOptions } from "@/lib/auth";
import "./globals.css";

import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "GovSphere", template: "%s · GovSphere" },
  description:
    "Plateforme sécurisée de collaboration interne pour le Gouvernement de la République Démocratique du Congo.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 text-gray-900 antialiased`}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
