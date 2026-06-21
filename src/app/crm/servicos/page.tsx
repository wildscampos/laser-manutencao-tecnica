import type { Metadata } from "next";
import { CrmApp } from "@/components/crm-app";

export const metadata: Metadata = {
  title: "Serviços | LaserFix",
  description: "Catálogo restrito de serviços e valores LaserFix.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmServicesPage() {
  return <CrmApp view="services" />;
}
