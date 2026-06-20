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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://laserfix.web.app";

const themeScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("laserfix-theme");
      const theme = storedTheme === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Manutenção de Máquinas de Corte a Laser CO₂ | LaserFix",
  description:
    "LaserFix: manutenção de máquinas de corte a laser CO₂, alinhamento óptico, troca de componentes, configuração e ajustes de precisão.",
  keywords: [
    "manutenção laser CO₂",
    "alinhamento óptico laser",
    "RD Works",
    "troca tubo laser CO₂",
    "manutenção máquina laser",
  ],
  openGraph: {
    title: "LaserFix",
    description:
      "Seu laser sempre no ponto. Manutenção de máquinas de corte a laser CO₂ em Guaratinguetá e região.",
    url: siteUrl,
    siteName: "LaserFix",
    images: [
      {
        url: "/logo-laserfix.jpg",
        width: 1280,
        height: 720,
        alt: "Logo LaserFix",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  icons: {
    icon: "/logo-laserfix.jpg",
    apple: "/logo-laserfix.jpg",
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
    <html
      lang="pt-BR"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
