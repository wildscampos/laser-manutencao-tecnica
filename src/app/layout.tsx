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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://laser-manutencao-tecnica.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Manutencao Tecnica para Maquinas Laser CO2 | LASER Manutencao Tecnica",
  description:
    "Servicos de manutencao preventiva e corretiva, alinhamento optico, troca de componentes e configuracao RD Works para maquinas laser CO2.",
  keywords: [
    "manutencao laser CO2",
    "alinhamento optico laser",
    "RD Works",
    "troca tubo laser CO2",
    "manutencao maquina laser",
  ],
  openGraph: {
    title: "LASER Manutencao Tecnica",
    description:
      "Agende manutencao tecnica para maquinas laser CO2: alinhamento, limpeza, componentes e RD Works.",
    url: siteUrl,
    siteName: "LASER Manutencao Tecnica",
    images: [
      {
        url: "/logo-laser-manutencao.jpg",
        width: 1280,
        height: 1280,
        alt: "Logo LASER Manutencao Tecnica",
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
