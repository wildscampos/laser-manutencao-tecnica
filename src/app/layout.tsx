import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://laser-manutencao-tecnica.web.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Manutenção Técnica para Máquinas Laser CO2 | LASER Manutenção Técnica",
  description:
    "Serviços de manutenção preventiva e corretiva, alinhamento óptico, troca de componentes e configuração RD Works para máquinas laser CO2.",
  keywords: [
    "manutenção laser CO2",
    "alinhamento óptico laser",
    "RD Works",
    "troca tubo laser CO2",
    "manutenção máquina laser",
  ],
  openGraph: {
    title: "LASER Manutenção Técnica",
    description:
      "Agende manutenção técnica para máquinas laser CO2: alinhamento, limpeza, componentes e RD Works.",
    url: siteUrl,
    siteName: "LASER Manutenção Técnica",
    images: [
      {
        url: "/logo-laser-manutencao.jpg",
        width: 1280,
        height: 1280,
        alt: "Logo LASER Manutenção Técnica",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  icons: {
    icon: "/logo-laser-manutencao.jpg",
    apple: "/logo-laser-manutencao.jpg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
